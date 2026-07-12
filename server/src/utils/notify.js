import Notification from '../models/Notification.js';

export const createNotification = async ({ user, title, message, type = 'info', entityId = null }) => {
  return Notification.create({
    user,
    title,
    message,
    type,
    entityId,
  });
};