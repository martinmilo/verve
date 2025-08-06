import { model } from "../../decorators/model";
import { id, text, record, list } from "../../../field";
import { Model } from "../Model";

@model({
  id: id().generate(() => 'post-id'),
  title: text(),
  content: text().nullable,
  author: record('User').nullable.associate('id').to('user.id'),
  assets: list('Asset').associate('post.id').to('id'),
})
export class Post extends Model.Typed<'Post'>() {}