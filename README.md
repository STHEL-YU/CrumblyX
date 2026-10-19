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

The web app manifest, app icons, and service worker are provided in `public/` for installation and app-shell caching on supported browsers. Product and café photography is loaded from Unsplash.
