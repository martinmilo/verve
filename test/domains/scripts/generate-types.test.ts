import { expect, describe, it } from "vitest";
import { ModelTypeGenerator } from "../../../src/scripts/generate-types";

describe('Generate types', () => {
  it('generate correct types for models', async () => {
    const types = await new ModelTypeGenerator('test').generateTypes();
    expect(types).toBe(`// ------------------------------------------------------
// THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
// ------------------------------------------------------
import { Role } from '../setup/enums/role';
import { State } from '@enums/state';

export type Asset = VerveModels['Asset'];
export type Editor = VerveModels['Editor'];
export type Post = VerveModels['Post'];
export type User = VerveModels['User'];

declare global {
  interface VerveModels {
    Asset: {
      id: string;
      name: string;
      type: string;
      size: number;
      extension: string;
      hash: string;
      post: Post | null;
      createdAt: Date;
    };
    Editor: {
      id: string;
      name: string | null;
      role: Role;
      state: State;
      createdAt: Date;
    };
    Post: {
      id: string;
      title: string;
      content: string | null;
      author: User | null;
      assets: Asset[];
    };
    User: {
      id: string;
      name: string | null;
      lastName: string | null;
      password: string;
      age: number | null;
      email: string;
      role: Role;
      groups: string[];
      posts: Post[];
      settings: { theme: string; notifications: boolean; };
      isActive: boolean;
      createdAt: Date;
    };
  }
}

export {};
`);
  });
});
