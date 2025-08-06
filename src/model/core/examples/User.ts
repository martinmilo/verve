import { model } from "../../decorators/model";
import { id, text, number, bool, date, option, list, record } from "../../../field";
import { Model } from "../Model";
import { can } from "../../../authorization";

export const nowDate = new Date();

export enum Role {
  USER = 'user',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

@model({
  id: id().generate(() => 'some-id'),
  name: text().nullable,
  lastName: text().nullable,
  password: text().readable(false).validate.only([(value) => value.length > 2]),
  age: number().nullable.validate.only([(value) => value > 18]).readable((context) => context.auth.role.includes(Role.ADMIN)),
  email: text().validate.lazy.only([(value) => value.includes('@')]),
  role: option(Role).default(Role.USER).writable((context) => context.auth.role.includes(Role.ADMIN)),
  groups: list().default(['group-1', 'group-2']),
  posts: list('Post').associate('author.id').to('id'),
  settings: record<{ theme: string; notifications: boolean; }>().default({ theme: 'light', notifications: true }),
  isActive: bool().default(true),
  createdAt: date().generate(() => nowDate),
})
export class User extends Model.Typed<'User'>() {
  getFullName() {
    return `${this.name} ${this.lastName}`;
  }

  @can((context) => context.auth.role.includes(Role.ADMIN))
  adjustRole() {
    return 'adjusted role';
  }

  @can((context, user) => context.auth.id === user.id)
  adjustSettings() {
    return 'adjusted settings';
  }
}