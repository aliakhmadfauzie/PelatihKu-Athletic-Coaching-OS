---
title: PelatihKu PRO Semantic Versioning, Release & Schema Evolution Rules
trigger: model_decision
description: "Mandatory rules and standards for Semantic Versioning (SemVer 2.0.0), Git release tagging, package.json synchronization, PWA cache busting, and Cloud Firestore schema migrations in PelatihKu PRO."
always_on: true
---

# Semantic Versioning, Release & Schema Evolution Standards (PelatihKu PRO)

This rule governs application versioning, Git commit and release tagging conventions, client-side PWA cache busting, and persistent Cloud Firestore schema migrations for PelatihKu PRO.

---

## 1. Semantic Versioning Specification (SemVer 2.0.0)

Every application, package, and component release MUST follow **SemVer 2.0.0** (`vMAJOR.MINOR.PATCH`):

| Level | Increment | Trigger Conditions | Examples in PelatihKu PRO |
| :--- | :--- | :--- | :--- |
| **MAJOR** | `X.0.0` | Breaking architectural changes, non-backward-compatible database schema alterations, breaking authentication overhaul. | Migrating to multi-gym enterprise tenant, splitting flat client records into non-compatible sub-collections without legacy adapter. |
| **MINOR** | `0.X.0` | New backward-compatible capabilities, new UI pages or modal flows, additive non-breaking database fields. | Adding "Ubah Data Member" modal, adding AI workout periodization generator, adding automated PDF report export. |
| **PATCH** | `0.0.X` | Backward-compatible bug fixes, copy corrections, CSS layout refinements, fitness formula tuning (1RM, macros), touch target padding, security patches. | Fixing schedule persistence to Firestore, sanitizing undefined fields in setDoc(), adjusting calendar date labeling. |

---

## 2. Synchronized Single Source of Truth

When bumping the application version, all corresponding version references MUST be updated simultaneously in the same atomic commit:

1. **`package.json`**: `"version": "X.Y.Z"` must be the authoritative source of truth.
2. **PWA Service Worker (`public/sw.js`)**: Cache bucket identifier and header comments must mirror the version:
   ```javascript
   // Version: X.Y.Z
   const CACHE_NAME = 'pelatihku-vX.Y.Z';
   ```
3. **Web Manifest (`public/manifest.json`)**: If version metadata is declared, keep in sync with `package.json`.
4. **Documentation**: Header version in `DEVELOPMENT_RULES.md` and `APP_REQUIREMENTS.md`.

---

## 3. Git Release Tagging & Conventional Commits

### Commit Message Structure
All commits MUST follow the Conventional Commits specification:
```text
<type>(<scope>): <short imperative description>

[optional longer body detailing motivation and changes]
```

Standard types:
- `feat`: New user-facing feature or capability
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code reorganization without functional behavior change
- `style`: Visual styling, theme tokens, typography, layout
- `test`: Adding or updating test suites
- `chore`: Version bumps, dependency updates, configuration adjustments
- `docs`: Documentation, README, or architecture rule updates

### Release Tagging
Every deployment to staging or production Firebase Hosting must have an annotated Git tag:
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z: <Summary of Key Features & Fixes>"
git push origin vX.Y.Z
```

---

## 4. Persistent Database & Firestore Schema Versioning

To ensure zero-downtime deployments and prevent client crashes during progressive web app rollout:

1. **Backward-Compatible Schema Additions**:
   - New document fields in `ClientProfile`, `CoachProfileData`, or `SessionRecord` must always be optional (`field?: string`) or supply a safe default value in `INITIAL_CLIENTS`.
   - Client code must never assume newly introduced fields exist on historic Firestore records.
2. **Sanitize Data Before Firestore Writes**:
   - Never write `undefined` values to `setDoc()`, `updateDoc()`, or `writeBatch()`.
   - Always run `sanitizeForFirestore()` before writing.
3. **Multi-Tab Persistent Cache**:
   - Maintain `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` and `ignoreUndefinedProperties: true`.

---

## 5. PWA & Client Cache-Busting Protocol

To prevent clients from executing stale cached bundles after deployment:

1. **Service Worker Activation**: The `activate` event in `public/sw.js` must delete all stale cache keys:
   ```javascript
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(
           keys
             .filter((key) => key !== CACHE_NAME)
             .map((key) => caches.delete(key))
         )
       )
     );
     self.clients.claim();
   });
   ```
2. **HTTP Headers in `firebase.json`**:
   - `index.html` and `sw.js` served with:
     ```http
     Cache-Control: no-cache, no-store, must-revalidate
     ```
   - Bundled assets (`/assets/**`) served with:
     ```http
     Cache-Control: public, max-age=31536000, immutable
     ```

---

## 6. Pre-Release Verification Checklist

Never bump a version or push a release tag without passing the pre-flight verification gate:
1. `npm run lint` / `tsc --noEmit`: 0 TypeScript compilation errors.
2. `npm run build`: Production asset compilation finishes cleanly without bundle errors.
