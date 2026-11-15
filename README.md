# Locum Pharmacy Shift Match

Build Locum4U, a clean, modern, mobile-first responsive PWA marketplace connecting pharmacy employers directly with locum pharmacists. MVP launches in Ireland, with UK-ready foundations from day one.

Core business rules:
- Only employer accounts can create, edit, publish, cancel, and mark shifts filled. Locums can never create or modify shifts.
- Locums browse/search/filter open shifts and apply. Prevent duplicate applications per locum per shift.
- Employer direct contact details must not appear on public shift cards or to locums before applying. Reveal relevant employer contact details only to a locum after their successful application. Employers can see applicant contact details only for applications to their own shifts.
- Employers review applicants and mark shifts filled/cancelled. Expired shifts leave active search. Include listing reports and a simple admin moderation view.
- No payments, payroll, timesheets, contracts, HR document storage, agency commission, or clinical services.

Screens and flows:
1. Landing/welcome page explaining direct connection without agency commission; role selection Employer or Locum.
2. Registration/sign-in and role-specific profile setup.
3. Employer dashboard with pharmacy profile, active shifts, application counts and history; create/edit shift; view applicants.
4. Shift form with pharmacy name/address, country, date, start/end, hourly rate/currency, role and registration requirements, experience/notes, contact email/phone and application deadline.
5. Locum dashboard with profile, location/radius, availability/preferences, registration type/number and preferred rate; searchable shift feed with location/date/rate/registration filters; shift detail; apply; application history/status.
6. Simple admin moderation page for reports and listing/user status.

Data and security:
- Use the supported full-stack backend/database. Create relational tables for profiles/users, pharmacies, shifts, applications, reports and notifications.
- Country IE/UK, currency EUR/GBP, separate PSI Ireland and GPhC UK registration fields; default Ireland.
- Implement database-level role-based access policies, not just UI hiding. Employers manage only their own pharmacy and shifts. Locums manage only their profile and applications. Employer contact fields stay private until an application exists for that locum. Admin access restricted. Validate sensitive mutations server-side.
- Do not claim PSI/GPhC registration or insurance is verified. State employers are responsible for checking registration, indemnity insurance and suitability.
- Add GDPR-aware privacy/terms placeholders and minimise personal data.
- Lightweight matching only after core flows: transparent deterministic score from location, date/availability, rate and registration type. Optional shift-description parser may suggest structured fields for employer review; never auto-publish or decide eligibility. No costly autonomous agents; never expose API secrets client-side.
- Polished, accessible, uncluttered responsive mobile/desktop UI with validation, empty/loading/error states and demo seed data clearly labelled demo.
- Build functional flows, not static mockups. Document external credentials/integrations that remain necessary rather than pretending they work.

Implementation priority: scaffold UI and data model; implement authentication, roles, employer posting, locum search, application and contact-unlock flows; then matching. Summarise completed work and unfinished integrations/security items.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://locum-pharmacy-shift-match.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2037b5e5-b9f7-4dae-9c44-bceaa5f23254).

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
