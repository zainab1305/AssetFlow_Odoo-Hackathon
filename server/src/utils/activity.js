import Activity from '../models/Activity.js';

export const logActivity = async ({ title, detail = '', type = 'asset', user = null, meta = {} }) => {
  return Activity.create({ title, detail, type, user, meta });
};