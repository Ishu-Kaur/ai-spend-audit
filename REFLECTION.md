# Engineering Reflection

## 1. Hardest Bug Encountered
The hardest bug encountered this week was resolving strict compiler and linter warnings regarding the `react-hooks/set-state-in-effect` rule on our main frontend page. When we originally designed our `localStorage` state reader, we retrieve the values and call `setTeamSize` or `setSelectedTools` synchronously inside a mounting `useEffect` hook. 

While this ran locally on `localhost:3000`, the strict Next.js compiler on our GitHub Actions pipeline flagged this as a cascading render performance hazard and aborted the build. To resolve this, I refactored our state management using **lazy state initialization**—passing a callback function directly into the `useState` definition. This retrieved local storage variables during the initial render loop itself, avoiding the extra render cycle and completely removing the need for a mounting `useEffect` block.

## 2. Decision Reversed Mid-Week
During the middle of the week, I originally configured our GitHub Actions pipeline to run clean dependency installations using **`npm ci --legacy-peer-deps`**. I chose `npm ci` because it is standard for clean builds on server runners. 

However, because our local Windows development machine and GitHub's Ubuntu server environment resolved package peer dependencies slightly differently, the strict lockfile verification failed on the server with an `EUSAGE` out-of-sync error. I made the decision to change the build pipeline from `npm ci` to **`npm install --legacy-peer-deps`**. This successfully bypassed the strict package-lock verification while maintaining perfect compilation stability and resolving our CI blockages.

## 3. What I Would Build in Week 2
If I had another week, I would implement:
1. **Interactive Charting:** A clean, visual SVG chart or pie chart mapping their tool spend proportions (e.g., using Tailwind charts or a lightweight charting library).
2. **Open Graph Image Generation:** Dynamic canvas-based image generation to serve a real-time preview card showing their exact calculated savings when they share their custom public URL on Twitter or LinkedIn.
3. **PDF Export Functionality:** A serverless PDF export route that generates a beautiful, branded formal savings report that founders can directly download and share with their finance departments.

## 4. AI Tool Usage and Learnings
I used AI tools (such as Claude and ChatGPT) as virtual pair-programmers to assist with boilerplates and configuring Next.js API structures. AI is highly effective for drafting clean CSS structures and mapping database connection configurations. 

However, I learned not to trust AI with direct mathematical calculations or complex logic evaluation. During an initial draft, the AI attempted to use a generalized language model to calculate the overspend math dynamically. This led to floating-point errors and inconsistent savings figures. I caught this error and immediately hardcoded our mathematical rules in pure, testable TypeScript functions inside `auditEngine.ts`, validating them using automated Vitest unit tests.

## 5. Self-Rating (1-10 Scale)
- **Discipline (10/10):** I successfully structured my development over 7 distinct calendar days, updating our development logs daily and maintaining a clean, systematic Git push cadence.
- **Code Quality (9/10):** The codebase compiles cleanly, features strict TypeScript types, avoids the `any` keyword, and passes ESLint verification with zero warnings.
- **Design Sense (8/10):** The user interface is clean, dark-themed, responsive, and features animated metrics blocks, though I would like to add more graphical charts in future iterations.
- **Problem Solving (9/10):** Successfully debugged lockfile version mismatches and hook rendering cycles using standard, elegant engineering patterns.
- **Entrepreneurial Thinking (9/10):** Built a tool that is highly conversion-focused, features honest optimization CTAs, and includes defensive, finance-literate math reasoning.