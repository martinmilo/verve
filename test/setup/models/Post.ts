import { Model, model, id, text, record, list } from "../../../src";
import { Asset } from "./Asset";
import { User } from "./User";

@model({
  id: id().generate(() => 'post-id'),
  title: text(),
  content: text().nullable,
  author: record<User>().nullable,
  assets: list<Asset>(),
})
export class Post extends Model.Typed<'Post'>() {}