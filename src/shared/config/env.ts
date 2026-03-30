export const env = {
  customerApiUrl:
    import.meta.env.VITE_CUSTOMER_API_URL ?? 'https://api.prohelper.pro/api/v1/customer',
  landingAuthUrl:
    import.meta.env.VITE_LANDING_AUTH_URL ?? 'https://api.prohelper.pro/api/v1/landing/auth'
};

