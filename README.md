# Team Weaver

You are the lead product architect for ProjectMatch, an AI-powered team formation platform for students doing projects, hackathons, competitions, research, and startups.

The problem:

Students usually form teams through existing friends and struggle to discover people with complementary skills, relevant experience, shared interests, and compatible availability.

Core workflow:

Student Profile → Create Project → Analyze Requirements → Find Compatible Students → Explain Match → Form Team

Student profiles must include:

- Name

- Skills

- Interests

- Experience / past projects

- Availability

Projects must include:

- Project name

- Description

- Required skills

- Required team size

- Preferred availability

Matching should consider:

- Skill compatibility

- Project requirements

- Relevant experience

- Interests

- Availability

The product should eventually provide:

- A compatibility score

- A clear explanation of why each student is recommended

Do not build the application yet.

First, create a concise MVP architecture document containing:

1. Main screens/pages

2. End-to-end user journey

3. Simple data model/database schema

4. Matching architecture and compatibility-score logic

5. Where AI should be used and where deterministic rules are better

6. Simplest MVP architecture that can be built and deployed in a few hours

7. Technical risks that could affect a live demo

8. Recommended stack: React frontend with Supabase for authentication and database

Constraints:

- Prioritize a polished, working, demonstrable MVP.

- Avoid chat, payments, social feeds, video calls, complex notifications, large admin systems, and other nonessential features.

- Keep the matching logic simple, explainable, and reliable for a demo.

- Use tables or diagrams where useful.

- Do not write implementation code yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8220e2e8-130f-4cef-903d-dc57c79729a1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
