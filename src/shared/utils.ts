export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const getAppDataPath = (): string => {
  const { app } = require('electron');
  return app.getPath('userData');
};
