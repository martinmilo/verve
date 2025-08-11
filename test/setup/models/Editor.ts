import { Model, model, id, text, date, option } from "../../../src";
import { nowDate } from "../utils/now";
import { Role } from "../enums/role";
// @ts-ignore
import { State } from "@enums/state";

export const DEFAULT_EDITOR_ID = 'editor-id';

@model({
  id: id().generate(() => DEFAULT_EDITOR_ID),
  name: text().nullable,
  role: option(Role).default(Role.USER).writable((context) => context?.auth?.role?.includes(Role.ADMIN)),
  state: option(State).default(State.ACTIVE),
  createdAt: date().generate(() => nowDate),
})
export class Editor extends Model.Typed<'Editor'>() {}