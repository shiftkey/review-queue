import { ignorePullRequestAuthors } from '../lib/config'

import * as moment from 'moment'
import chalk from 'chalk'

import {
  GitHubClient,
  PullRequest,
  Commit,
  Comment,
  PullRequestReview,
} from '../lib/api'

interface PullRequestSummary {
  readonly pr: PullRequest
  readonly mergeable: boolean
  readonly lastCommentByAuthor: Comment | null
  readonly lastCommentByMe: Comment | null
  readonly commitsByMe: ReadonlyArray<Commit>
  readonly reviews: ReadonlyArray<PullRequestReview>
}

function toRelativeTime(time: string) {
  const then = moment(time)
  const now = moment()
  return then.from(now)
}

function outputReviewSummary(
  reviews: ReadonlyArray<PullRequestReview>,
  me: string
) {
  const reviewsByMe = reviews.filter(r => r.user.login === me)
  if (reviewsByMe.length > 0) {
    const mostRecentReview = reviewsByMe[reviewsByMe.length - 1]
    if (mostRecentReview.state === 'CHANGES_REQUESTED') {
      console.log(
        ` - 🔍 ${chalk.red(
          `You asked changes to this PR ${toRelativeTime(
            mostRecentReview.submitted_at
          )}`
        )}`
      )
    } else if (mostRecentReview.state === 'APPROVED') {
      console.log(
        ` - 🔍 ${chalk.green(
          `You approved this PR ${toRelativeTime(
            mostRecentReview.submitted_at
          )}`
        )}`
      )
    } else {
      console.log(
        ` - 🔍 You last commented on this PR ${toRelativeTime(
          mostRecentReview.submitted_at
        )}.`
      )
    }
  } else {
    const commentedPRs = reviews.filter(r => r.state === 'COMMENTED').length
    const approvedPRs = reviews.filter(r => r.state === 'APPROVED').length
    const changesRequestedPRs = reviews.filter(
      r => r.state === 'CHANGES_REQUESTED'
    ).length

    console.log(
      ` - 🔍 Reviews found: ${approvedPRs} approved, ${changesRequestedPRs} request changes and ${commentedPRs} comments`
    )
  }
}

function outputPullRequestStatus(summary: PullRequestSummary, me: string) {
  const {
    pr,
    mergeable,
    lastCommentByAuthor,
    lastCommentByMe,
    commitsByMe,
    reviews,
  } = summary
  const login = pr.user.login

  console.log(
    `📝 ${chalk.bold(`#${pr.number}`)} - ${pr.title} by ${chalk.bold(
      `@${login}`
    )}`
  )

  if (!mergeable) {
    console.log(` - 🚨 ${chalk.red('This PR is not currently mergeable')}`)
  }

  if (pr.assignee != null) {
    console.log(` - ✅ ${chalk.green('You are assigned to this PR')}`)
  }

  if (commitsByMe.length > 0) {
    console.log(` - 🚨 ${chalk.red('You have contributed to this PR')}`)
  }

  if (reviews.length > 0) {
    outputReviewSummary(reviews, me)
  } else {
    if (lastCommentByMe != null) {
      console.log(
        ` - 💬 Last activity from you was ${toRelativeTime(
          lastCommentByMe.updated_at
        )}`
      )
    } else {
      console.log(` - 👻 You have not commented on this PR`)
    }
  }

  if (lastCommentByAuthor != null) {
    const commentWasEdit =
      lastCommentByAuthor.created_at !== lastCommentByAuthor.updated_at

    const action = commentWasEdit ? 'editing a comment' : 'a comment'

    console.log(
      ` - 💬 Last activity from ${
        lastCommentByAuthor.user.login
      } was ${action} ${toRelativeTime(lastCommentByAuthor.updated_at)}`
    )
  }

  console.log()
}

async function run(token: string) {
  const client = new GitHubClient('desktop', 'desktop', token)

  const user = await client.getUser()
  const me = user.login

  console.log(`✅ token found for ${chalk.bold(me)}...`)
  console.log()

  const authorsToIgnore = [
    // ignoring my pull requests
    me,
    // ignoring banned users that have submitted PRs
    ...ignorePullRequestAuthors,
  ]

  const pullRequests = await client.getOpenPullRequests()

  for (const pr of pullRequests) {
    const login = pr.user.login
    if (authorsToIgnore.indexOf(login) > -1) {
      continue
    }

    if (pr.assignee != null && pr.assignee.login !== me) {
      continue
    }

    const mergeable =
      pr.mergeable != null
        ? pr.mergeable
        : await client.getMergeableState(pr.number)

    const reviews = await client.getReviewsFor(pr)

    const lastCommentByAuthor = await client.getLatestCommentBy(
      pr,
      pr.user.login
    )
    const lastCommentByMe = await client.getLatestCommentBy(pr, me)
    const commitsByMe = await client.getCommitsBy(pr, me)
    outputPullRequestStatus(
      {
        pr,
        mergeable,
        lastCommentByAuthor,
        lastCommentByMe,
        commitsByMe,
        reviews,
      },
      me
    )
  }
}

const token = process.env.GITHUB_ACCESS_TOKEN

if (token == null) {
  throw new Error(
    'You need to provide a GITHUB_ACCESS_TOKEN environment variable'
  )
}

run(token)
