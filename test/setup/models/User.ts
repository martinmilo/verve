import { Model, model, id, text, number, bool, date, option, list, record, can } from "../../../src";
import { nowDate } from "../utils/now";
import { Role } from "../enums/role";
import { Post } from "./Post";

export const DEFAULT_USER_ID = 'some-id';

@model({
  id: id().generate(() => DEFAULT_USER_ID),
  name: text().nullable,
  lastName: text().nullable,
  password: text().readable(false).validate.only([(value) => value.length > 2]),

  age: number().nullable.validate.only([(value) => value > 18])
    .readable((context) => context?.auth?.role?.includes(Role.ADMIN)),

  email: text().validate.lazy.only([(value) => value.includes('@')]),

  role: option(Role).default(Role.USER)
    .writable((context, user) => context?.auth?.role?.includes(Role.ADMIN) || user.id === context?.auth?.id),

  groups: list().default(['group-1', 'group-2']),
  posts: list<Post>(),
  settings: record<{ theme: string; notifications: boolean; }>().default({ theme: 'light', notifications: true }),
  isActive: bool().default(true),
  createdAt: date().generate(() => nowDate),
})
export class User extends Model.Typed<'User'>() {
  getFullName() {
    return `${this.name} ${this.lastName}`;
  }

  @can((context) => context?.auth?.role?.includes(Role.ADMIN))
  adjustRole() {
    return 'adjusted role';
  }

  @can((context, user) => context?.auth?.id === user.id)
  adjustSettings() {
    return 'adjusted settings';
  }
}