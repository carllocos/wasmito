[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ScheduleBeforeTimeStamp

# Class: ScheduleBeforeTimeStamp

Defined in: [src/hooks/schedule.ts:63](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L63)

## Extends

- [`LogicalClockScheduling`](LogicalClockScheduling.md)

## Constructors

### Constructor

> **new ScheduleBeforeTimeStamp**(`logicalClock`): `ScheduleBeforeTimeStamp`

Defined in: [src/hooks/schedule.ts:64](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L64)

#### Parameters

##### logicalClock

[`LogicalClock`](../type-aliases/LogicalClock.md)

#### Returns

`ScheduleBeforeTimeStamp`

#### Overrides

[`LogicalClockScheduling`](LogicalClockScheduling.md).[`constructor`](LogicalClockScheduling.md#constructor)

## Properties

### logicalClock

> `readonly` **logicalClock**: [`LogicalClock`](../type-aliases/LogicalClock.md)

Defined in: [src/hooks/schedule.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L40)

#### Inherited from

[`LogicalClockScheduling`](LogicalClockScheduling.md).[`logicalClock`](LogicalClockScheduling.md#logicalclock)

***

### scheduleKind

> `readonly` **scheduleKind**: `ScheduleKind`

Defined in: [src/hooks/schedule.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L17)

#### Inherited from

[`LogicalClockScheduling`](LogicalClockScheduling.md).[`scheduleKind`](LogicalClockScheduling.md#schedulekind)

## Methods

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/schedule.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L46)

#### Returns

`string`

#### Inherited from

[`LogicalClockScheduling`](LogicalClockScheduling.md).[`serializeBinary`](LogicalClockScheduling.md#serializebinary)
