import Notification from '../models/Notification.js';

export const createNotification = async ({
  user,
  title,
  message,
  type = 'info',
  category = 'system_alert',
  module = '',
  assetTag = '',
  triggeredBy = null,
  metadata = {},
  entityId = null,
}) => {
  return Notification.create({
    user,
    title,
    message,
    type,
    category,
    module,
    assetTag,
    triggeredBy,
    metadata,
    entityId,
  });
};