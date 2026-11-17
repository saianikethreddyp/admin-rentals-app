# admin-rentals-app

Staff app for Thandra Cars (Expo SDK 57, React Native, TypeScript). It talks to the Thandra API
(`go-backend`) and replaces the hidden admin panel that used to live inside the customer app.

## Screens

| Area | What an admin can do |
|---|---|
| Home | Pickups today, rides out now, upcoming, customers, this month's revenue, fleet status per hub |
| Bookings | Search by customer, filter by status, pickup date and hub. Open one to start the ride, complete it, cancel it, call or WhatsApp the customer, open the hub in Maps, and view the customer's contacts (every view is recorded) |
| Cars | List with photos and filters. Add and edit cars, upload up to 10 photos, set Available, Maintenance or Retired |
| Hubs | Add and edit hubs. Search a place or drop a pin on an OpenStreetMap map; no coordinates are typed. Deactivate a hub |
| Customers | Search, see booking history, block or unblock, send a push notification |
| Admin team | Add admins, deactivate or reactivate, reset a password (temporary, must be changed), last login |
| Account | Change password (signs out other devices), sign out |

## Run

```sh
npm install
cp .env.example .env          # EXPO_PUBLIC_API_URL, defaults to the Render service
npx expo start                # Expo Go works for everything except push
```

The first request after the API has been idle can take up to a minute on Render's free plan. The sign-in
screen says so while it waits.

## Test

```sh
npm run typecheck
npm test                      # unit tests + screen render tests
npm run test:contract         # optional, against a running API (see src/api/contract.test.ts)
npx expo-doctor
```

`src/api/client.test.ts` covers the part that matters most: refresh tokens are single use on the server, so
concurrent requests must share one refresh. A second parallel refresh would look like token theft and sign
everyone out.

## Build an installable APK for staff

```sh
npx eas-cli login
npx eas-cli build -p android --profile preview
```

The Android package is `com.thandracars.admin`. It is a staff app, so share the APK link directly instead of
publishing it on the Play Store.

## Notes

- Tokens: the access token lives in memory, the refresh token in the device's secure storage.
- Maps: OpenStreetMap tiles and Nominatim search are free but meant for light use, which fits a few hub
  edits. If usage grows, switch to a paid tile and geocoding provider (for example Ola Maps).
- Deactivating an admin or blocking a customer ends their sessions at once.
