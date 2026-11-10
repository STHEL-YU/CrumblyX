# CrumblyX – Pastries & Specialty Coffee

A mobile-first café table-ordering experience built with React, Vite, and Tailwind CSS. The customer flow includes welcome and sign-in screens, a QR table menu, customizable item details, and a cart drawer.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL with `?table=3` to use the demo table number. The app defaults to Table 3 when no table query parameter is supplied.

## Production build

```sh
npm run build
npm run preview
```

## Create the initial admin account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment where the database is configured, then run:

```sh
npm run admin:create
```

For the requested initial account, use `admin@crumblyx.com` and the password you provided. The password is hashed before it is stored. The setup command never overwrites an existing account.

The web app manifest, app icons, and service worker are provided in `public/` for installation and app-shell caching on supported browsers. Product and café photography is loaded from Unsplash.
