[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / ScheduleAfterTimeStamp

# Class: ScheduleAfterTimeStamp

Defined in: [src/hooks/schedule.ts:69](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L69)

## Extends

- [`LogicalClockScheduling`](LogicalClockScheduling.md)

## Constructors

### Constructor

> **new ScheduleAfterTimeStamp**(`logicalClock`): `ScheduleAfterTimeStamp`

Defined in: [src/hooks/schedule.ts:70](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L70)

#### Parameters

##### logicalClock

[`LogicalClock`](../type-aliases/LogicalClock.md)

#### Returns

`ScheduleAfterTimeStamp`

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
