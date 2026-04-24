export const env = {
  adminAppUrl:
    import.meta.env.VITE_ADMIN_APP_URL ?? 'https://app.prohelper.pro',
  customerApiUrl:
    import.meta.env.VITE_CUSTOMER_API_URL ?? 'https://api.prohelper.pro/api/v1/customer',
  customerAuthUrl:
    import.meta.env.VITE_CUSTOMER_AUTH_URL ??
    import.meta.env.VITE_LANDING_AUTH_URL ??
    'https://api.prohelper.pro/api/v1/customer/auth'
};
