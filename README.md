# Review Queue PoC

This is a demo which uses the GitHub API to generate a list of open PRs, as well as surface context to help you figure out what to focus on.

<img width="767" src="https://user-images.githubusercontent.com/359239/40568950-1aa512c6-60bd-11e8-83bc-fdeabe6f1b2b.png">

## Installation

After installing the repository you'll need to run `yarn` to install the dependencies it requires:

```shellsession
$ yarn
```

## Usage


```shellsession
$ GITHUB_ACCESS_TOKEN=[token] yarn review-queue
```

## What It's Doing

I'm currently using this to scan the [GitHub Desktop](https://github.com/desktop/desktop) pull request queue for:

* unassigned pull requests
* pull requests assigned to me

For each of these pull requests, I poke at the activity of the repository to identify some interesting behaviour:

* have I contributed to this PR? (maintainers can push commits to contributor PRs, for example)
* have I reviewed this PR already?
* have I commented on this PR?
* when was the last time the author commented on this PR?

This helps identify PRs that are neglected and need some eyes, or PRs that have gone stale and need a nudge.

## Things To Contribute

A non-exhaustive list:

* it's all run through `yarn` and `ts-node` - needs to emit to JS so it can be used in other situations
* I've only tested this in iTerm2 - there's probably lots of work to uncover here on other OSes (theming?)
* not currently exposed as a `bin` command - [here's a quick guide on that if someone wants to take a shot](https://blog.npmjs.org/post/118810260230/building-a-simple-command-line-tool-with-npm)
* it's currently tied to `desktop/desktop` but that's parameterized - if someone wants to move that up to an parameter that can be passed in from the command line that seems like a reasonable step
* better docs about the rules used so we can figure out how to tweak things
* the `ignorePullRequestAuthors` config value is not configurable, but shouldn't be necessary unless you're GitHub staff (long story)
