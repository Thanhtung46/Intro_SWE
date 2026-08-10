import { parseRegisterDto } from '../dto/register.dto.js';
import * as authService from '../service/auth.service.js';

export async function register(req, res, next) {
  try {
    const dto = parseRegisterDto(req.body);
    const result = await authService.registerPlayer(dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}
