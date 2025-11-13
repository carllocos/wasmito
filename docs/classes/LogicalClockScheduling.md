[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / LogicalClockScheduling

# Abstract Class: LogicalClockScheduling

Defined in: [src/hooks/schedule.ts:39](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L39)

## Extends

- [`HookSchedule`](HookSchedule.md)

## Extended by

- [`ScheduleOnTimeStamp`](ScheduleOnTimeStamp.md)
- [`ScheduleBeforeTimeStamp`](ScheduleBeforeTimeStamp.md)
- [`ScheduleAfterTimeStamp`](ScheduleAfterTimeStamp.md)

## Constructors

### Constructor

> **new LogicalClockScheduling**(`scheduleKind`, `timestamp`): `LogicalClockScheduling`

Defined in: [src/hooks/schedule.ts:41](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L41)

#### Parameters

##### scheduleKind

`ScheduleKind`

##### timestamp

[`LogicalClock`](../type-aliases/LogicalClock.md)

#### Returns

`LogicalClockScheduling`

#### Overrides

[`HookSchedule`](HookSchedule.md).[`constructor`](HookSchedule.md#constructor)

## Properties

### logicalClock

> `readonly` **logicalClock**: [`LogicalClock`](../type-aliases/LogicalClock.md)

Defined in: [src/hooks/schedule.ts:40](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L40)

***

### scheduleKind

> `readonly` **scheduleKind**: `ScheduleKind`

Defined in: [src/hooks/schedule.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L17)

#### Inherited from

[`HookSchedule`](HookSchedule.md).[`scheduleKind`](HookSchedule.md#schedulekind)

## Methods

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/schedule.ts:46](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L46)

#### Returns

`string`

#### Overrides

[`HookSchedule`](HookSchedule.md).[`serializeBinary`](HookSchedule.md#serializebinary)
