[**wasmito v1.0.0**](../README.md)

***

[wasmito](../globals.md) / HookSchedule

# Abstract Class: HookSchedule

Defined in: [src/hooks/schedule.ts:16](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L16)

## Extended by

- [`ScheduleOnce`](ScheduleOnce.md)
- [`ScheduleAways`](ScheduleAways.md)
- [`LogicalClockScheduling`](LogicalClockScheduling.md)

## Constructors

### Constructor

> **new HookSchedule**(`scheduleKind`): `HookSchedule`

Defined in: [src/hooks/schedule.ts:18](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L18)

#### Parameters

##### scheduleKind

`ScheduleKind`

#### Returns

`HookSchedule`

## Properties

### scheduleKind

> `readonly` **scheduleKind**: `ScheduleKind`

Defined in: [src/hooks/schedule.ts:17](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L17)

## Methods

### serializeBinary()

> **serializeBinary**(): `string`

Defined in: [src/hooks/schedule.ts:22](https://github.com/carllocos/Wasmito/blob/f8397161f15197d81591fc9fb815de99909372e0/src/hooks/schedule.ts#L22)

#### Returns

`string`
