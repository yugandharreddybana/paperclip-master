# Onboarding Wizard UX Refactor Plan
1. **Typography & Spacing**:
    - Update `text-sm` and `text-xs` to strictly follow `.claude/skills/design-guide/README.md`.
    - Better spacing for step headers.
2. **GitHub Step**:
    - Right now, the GitHub repository list is a standard `<ul className="divide-y">`. Let's elevate it:
      - Add better hover states using `bg-accent/40`.
      - Clearly distinguish selected items with a border/background combination.
      - Convert the "selected repositories" box to use a nicer tag layout with a remove icon.
3. **Step Transition**:
    - Wrap steps in an animated container if possible, or just improve the side-by-side Layout (Sidebar + content).
4. **Agent Selection**:
    - Enhance the model picker grid.

The GitHub OAuth logic is already hitting `/api/auth/link-social` using `authApi.linkGithubAccount()`. It is NOT mocked. I will preserve this logic exactly while upgrading the surrounding UI.
