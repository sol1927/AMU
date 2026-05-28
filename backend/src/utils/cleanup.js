import User from "../models/user.model.js";
import TempAdmin from "../models/TempAdmin.model.js";
import { finalizeExpiredStationScans } from "./mealSession.js";

const TEMP_ADMIN_RETENTION_MS = 24 * 60 * 60 * 1000;

export const runScheduledCleanup = async () => {
  try {
    const [users, tempAdmins, campuses] = await Promise.all([
      User.findAll(
        { resetTokenExpiresAfter: new Date(0) },
        {
          includePassword: true,
        },
      ),
      TempAdmin.findAll(),
      User.findAll({ role: "campus" }),
    ]);

    const expiredUsers = users.filter(
      (user) =>
        user.resetToken &&
        user.resetTokenExpires &&
        new Date(user.resetTokenExpires) < new Date(),
    );

    const staleTempAdmins = tempAdmins.filter((record) => {
      const createdAt = record.createdAt ? new Date(record.createdAt) : null;
      return (
        createdAt &&
        !Number.isNaN(createdAt.getTime()) &&
        Date.now() - createdAt.getTime() >= TEMP_ADMIN_RETENTION_MS
      );
    });

    await Promise.all([
      ...expiredUsers.map((user) =>
        User.updateById(user.id, {
          resetToken: null,
          resetTokenExpires: null,
        }),
      ),
      ...staleTempAdmins.map((record) => TempAdmin.deleteById(record.id)),
      ...campuses.map((campus) => finalizeExpiredStationScans(campus.id)),
    ]);
  } catch {
    // Ignore cleanup failures; expired tokens will be retried on the next pass.
  }
};
