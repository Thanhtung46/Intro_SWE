import * as revenueService from '../service/revenue.service.js';
import {
  parseRevenuePeriodDto,
  parseRevenueTimeseriesDto,
  parseRevenueExportDto,
} from '../dto/revenue-query.dto.js';

export async function revenueSummary(req, res, next) {
  try {
    const query = parseRevenuePeriodDto(req.query);
    const result = await revenueService.getRevenueSummary(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function revenueTimeseries(req, res, next) {
  try {
    const query = parseRevenueTimeseriesDto(req.query);
    const result = await revenueService.getRevenueTimeseries(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function revenueExport(req, res, next) {
  try {
    const query = parseRevenueExportDto(req.query);
    const result = await revenueService.exportRevenueCsv(req.user.userId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return res.status(200).send(result.content);
  } catch (err) {
    return next(err);
  }
}
