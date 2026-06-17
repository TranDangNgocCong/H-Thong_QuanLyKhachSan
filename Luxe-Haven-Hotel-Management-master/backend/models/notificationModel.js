const { query, sql } = require('../config/db');

class NotificationModel {
  /**
   * Automatically ensure notifications table exists in SQL Server
   */
  async ensureTableExists() {
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
        BEGIN
          CREATE TABLE notifications (
              id INT IDENTITY(1,1) PRIMARY KEY,
              title NVARCHAR(100) NOT NULL,
              message NVARCHAR(255) NOT NULL,
              is_read BIT DEFAULT 0,
              target_role NVARCHAR(50) DEFAULT 'all',
              created_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Table notifications has been created automatically.';
        END
        ELSE
        BEGIN
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND name = 'target_role')
          BEGIN
            ALTER TABLE notifications ADD target_role NVARCHAR(50) DEFAULT 'all';
          END
        END
      `);

      await query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[room_issues]') AND type in (N'U'))
        BEGIN
          CREATE TABLE room_issues (
              id INT IDENTITY(1,1) PRIMARY KEY,
              room_id INT FOREIGN KEY REFERENCES rooms(id) ON DELETE CASCADE,
              reporter_id INT FOREIGN KEY REFERENCES system_users(id),
              description NVARCHAR(MAX) NOT NULL,
              status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
              created_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Table room_issues has been created automatically.';
        END
      `);
      console.log('Notifications and Room Issues tables connection and schema checked.');
    } catch (err) {
      console.error('Failed to verify/create notifications table:', err);
    }
  }

  /**
   * Find the 5 most recent notifications filtered by role or all, with admin override
   */
  async findRecent(userRole = 'all') {
    const res = await query(`
      SELECT TOP 5 id, title, message, is_read AS [isRead], created_at AS [createdAt], target_role AS [targetRole]
      FROM notifications
      WHERE @userRole = 'admin' OR target_role = @userRole OR target_role = 'all'
      ORDER BY id DESC
    `, [
      { name: 'userRole', type: sql.NVarChar, value: userRole }
    ]);
    return res.recordset.map(r => ({
      ...r,
      isRead: r.isRead === true || r.isRead === 1 || r.isRead === '1'
    }));
  }

  /**
   * Mark all unread notifications as read filtered by role or all, with admin override
   */
  async markAllAsRead(userRole = 'all') {
    await query(`
      UPDATE notifications
      SET is_read = 1
      WHERE is_read = 0 AND (@userRole = 'admin' OR target_role = @userRole OR target_role = 'all')
    `, [
      { name: 'userRole', type: sql.NVarChar, value: userRole }
    ]);
    return true;
  }

  /**
   * Create a new notification
   */
  async create({ title, message, targetRole = 'all' }) {
    const res = await query(`
      INSERT INTO notifications (title, message, is_read, target_role)
      VALUES (@title, @message, 0, @targetRole);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'title', type: sql.NVarChar, value: title },
      { name: 'message', type: sql.NVarChar, value: message },
      { name: 'targetRole', type: sql.NVarChar, value: targetRole }
    ]);
    return res.recordset[0].id;
  }
}

module.exports = new NotificationModel();
