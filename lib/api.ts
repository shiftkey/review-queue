import * as moment from 'moment'

import * as octokit from '@octokit/rest'

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 1000)
  })
}

type Comment = {
  readonly updated_at: string
  readonly body: string
  readonly user: {
    readonly login: string
  }
}

const per_page = 100

export class GitHubClient {
  private readonly client = new octokit()

  public constructor(
    private readonly owner: string,
    private readonly repo: string,
    token: string
  ) {
    this.client.authenticate({
      type: 'token',
      token,
    })
  }

  public getUser = async () => {
    const user = await this.client.users.get({})
    return user.data
  }

  public getOpenPullRequests = async (
    sort: 'created' | 'updated' | 'popularity' | 'long-running' = 'updated',
    direction: 'asc' | 'desc' = 'asc'
  ) => {
    const result = await this.client.pullRequests.getAll({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      sort,
      direction,
      per_page,
    })
    return result.data
  }

  public getPullRequest = async (number: number) => {
    const result = await this.client.pullRequests.get({
      owner: this.owner,
      repo: this.repo,
      number,
    })
    return result.data
  }

  public getLastPullRequestComment = async (number: number, login: string) => {
    const pullRequestComments = await this.client.pullRequests.getComments({
      owner: this.owner,
      repo: this.repo,
      number,
      sort: 'created',
      direction: 'asc',
      per_page,
    })

    const prCommentsByAuthor = pullRequestComments.data.filter(
      c => c.user.login === login
    )

    let lastPRComment: Comment | null = null
    if (prCommentsByAuthor.length > 0) {
      lastPRComment = prCommentsByAuthor[0]
    }

    return lastPRComment
  }

  public getReviewsFor = async (pr: { number: number }) => {
    const result = await this.client.pullRequests.getReviews({
      owner: this.owner,
      repo: this.repo,
      number: pr.number,
      per_page,
    })
    return result.data
  }

  public getLastIssueComment = async (number: number, login: string) => {
    const issueComments = await this.client.issues.getComments({
      owner: this.owner,
      repo: this.repo,
      number,
      per_page,
    })

    issueComments.data.reverse()

    const issueCommentsByAuthor = issueComments.data.filter(
      c => c.user.login === login
    )

    let lastIssueComment: Comment | null = null
    if (issueCommentsByAuthor.length > 0) {
      lastIssueComment = issueCommentsByAuthor[0]
    }

    return lastIssueComment
  }

  public getLatestCommentBy = async (
    pr: { number: number },
    login: string,
    debug: boolean = false
  ) => {
    const lastPRComment = await this.getLastPullRequestComment(pr.number, login)
    const lastIssueComment = await this.getLastIssueComment(pr.number, login)

    if (lastIssueComment != null && lastPRComment != null) {
      const issueCommentTime = moment(lastIssueComment.updated_at)
      const prCommentTime = moment(lastPRComment.updated_at)

      if (issueCommentTime.diff(prCommentTime) > 0) {
        if (debug) {
          console.log(
            ` 🤖 last issue comment by ${lastIssueComment.user.login} at ${
              lastIssueComment.updated_at
            } was '${lastIssueComment.body}'`
          )
        }
        return lastIssueComment
      } else {
        if (debug) {
          console.log(
            ` 🤖 last PR comment by ${lastPRComment.user.login} at ${
              lastPRComment.updated_at
            } was '${lastPRComment.body}'`
          )
        }
        return lastPRComment
      }
    }

    if (lastIssueComment != null && lastPRComment == null) {
      if (debug) {
        console.log(
          ` 🤖 last issue comment by ${lastIssueComment.user.login} at ${
            lastIssueComment.updated_at
          } was '${lastIssueComment.body}'`
        )
      }
      return lastIssueComment
    }

    if (lastIssueComment == null && lastPRComment != null) {
      if (debug) {
        console.log(
          ` 🤖 last PR comment by ${lastPRComment.user.login} at ${
            lastPRComment.updated_at
          } was '${lastPRComment.body}'`
        )
      }
      return lastPRComment
    }

    return null
  }

  public getCommitsBy = async (pr: { number: number }, login: string) => {
    const result = await this.client.pullRequests.getCommits({
      owner: this.owner,
      repo: this.repo,
      number: pr.number,
      per_page,
    })

    const commitsByReviewer = result.data.filter(
      c =>
        (c.author != null && c.author.login === login) ||
        (c.committer != null && c.committer.login === login)
    )

    return commitsByReviewer
  }

  public getMergeableState = async (number: number): Promise<boolean> => {
    let newMergeableState: boolean | null = null
    let updatedPR = await this.getPullRequest(number)

    while (newMergeableState === null) {
      await delay(2000)
      updatedPR = await this.getPullRequest(number)

      newMergeableState = updatedPR.mergeable

      if (newMergeableState === null) {
        console.log(
          ` - mergeable is still null for #${number} - checking again...`
        )
      } else {
        return newMergeableState
      }
    }

    return false
  }
}
