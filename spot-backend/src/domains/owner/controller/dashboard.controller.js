import * as dashboardService from '../service/dashboard.service.js';
import { parseOwnerDashboardQueryDto } from '../dto/dashboard-query.dto.js';

export async function dashboardSummary(req, res, next) {
  try {
    const query = parseOwnerDashboardQueryDto(req.query);
    const result = await dashboardService.getDashboardSummary(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
