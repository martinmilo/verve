import { model } from "../../decorators/model";
import { id, text, record, number, date } from "../../../field";
import { Model } from "../Model";

export const dateNow = new Date();

// Example with validation that depends on other fields
// Test: We need to make sure that the validation works even with such circular rules (plus when readable is false for one)
// Solution: To achieve that, we initialize model in phases, first the field instances, then the values, then we validate
// Finally, we prevent fields from being readable/writable as a last step

@model({
  id: id().generate(() => `asset-id-${dateNow.getTime()}`),
  name: text().validate.lazy(value => !value.includes('.')),
  type: text()
    .validate((value, model) => {
      if (value === 'image' && ['jpg', 'png'].includes(model.extension)) {
        return true;
      }
      if (value === 'video' && ['mp4'].includes(model.extension)) {
        return true;
      }
      return false;
    })
    .readable((_, model) => {
      return model.extension === 'jpg' || model.extension === 'png';
    }),
  size: number(),
  extension: text().validate((value, model) => {
    if (model.type === 'image' && ['jpg', 'png'].includes(value)) {
      return true;
    }
    if (model.type === 'video' && ['mp4'].includes(value)) {
      return true;
    }
    return false;
  }),
  url: text().compute<'Asset'>((model) => `https://some-storage-url/${model.$id.get()}/${model.$name.get()}.${model.$extension.get()}`),
  hash: text().generate.lazy(() => 'random-hash'),
  post: record('Post').nullable.associate('id').to('post.id'),
  createdAt: date().generate(() => dateNow),
})
export class Asset extends Model.Typed<'Asset'>() {
  getURL() {
    return `https://some-storage-url/${this.$id.get()}/${this.$name.get()}.${this.$extension.get()}`;
  }
}