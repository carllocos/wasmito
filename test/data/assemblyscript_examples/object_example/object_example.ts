// asc test.ts -o test.wasm --disable mutable-globals --disable sign-extension --disable nontrapping-f2i --disable bulk-memory --sourceMap --debug

class A {
  constructor(public prop: string) {}
}

export function main(): void {
  let a = new A('hello world');

  let x: i32 = 0;
  while (x < 4) {
    x += 1;
  }
  a = new A('Blob');
  console.log(a.prop);
}
