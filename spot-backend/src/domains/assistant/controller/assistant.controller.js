import { parseSendMessageDto } from '../dto/assistant.dto.js';
import * as assistantService from '../service/assistant.service.js';

function extractAccessToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

export async function sendMessage(req, res, next) {
  try {
    const payload = parseSendMessageDto(req.body);
    const { status, body } = await assistantService.sendMessage(
      extractAccessToken(req),
      req.params.conversationId,
      payload,
    );
    return res.status(status).json(body);
  } catch (err) {
    return next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const { status, body } = await assistantService.getHistory(
      extractAccessToken(req),
      req.params.conversationId,
    );
    return res.status(status).json(body);
  } catch (err) {
    return next(err);
  }
}

export async function clearConversation(req, res, next) {
  try {
    const { status, body } = await assistantService.clearConversation(
      extractAccessToken(req),
      req.params.conversationId,
    );
    if (status === 204) {
      return res.status(204).send();
    }
    return res.status(status).json(body);
  } catch (err) {
    return next(err);
  }
}
