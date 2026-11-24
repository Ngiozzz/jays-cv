-- Job sources read like email: when the owner last opened one, and "mark as unread"
ALTER TABLE "JobSource" ADD COLUMN     "markedUnread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3);
