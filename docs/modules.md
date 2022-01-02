[](README.md) / Exports

# 

## Table of contents

### Type aliases

- [Manifest](modules.md#manifest)
- [Package](modules.md#package)
- [PackageList](modules.md#packagelist)
- [PackageReference](modules.md#packagereference)

### Functions

- [main](modules.md#main)

## Type aliases

### Manifest

Ƭ **Manifest**: `Object`

A list of script files, as well as where to download them from.

**`example`** The manifest for the `official-bbpm/bbpm` package.
{
    "/bin/bbpm.js": "https://github.com/jojotastic777/bitburner-bbpm/releases/download/v0.1.0/bbpm.js"
}

#### Index signature

▪ [scriptName: `string`]: `string`

#### Defined in

[bbpm.ts:72](https://github.com/jojotastic777/bitburner-bbpm/blob/4af6d6d/src/bin/bbpm.ts#L72)

___

### Package

Ƭ **Package**: `Object`

A package which bbpm can install.
Intended to represent a single script or library, but can include many scripts and/or libraries.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `author` | `string` | The author of the package. |
| `dependencies` | [`PackageReference`](modules.md#packagereference)[] | A list of other packages which the package depends on. |
| `description` | `string` | A brief description of the package. |
| `manifest` | [`Manifest`](modules.md#manifest) | A Manifest, which tells bbpm how to install the package. |
| `name` | `string` | The name of the package. |
| `version` | `string` | The current version of the package. Not currently used for anything, but may be used to manage updates later. |

#### Defined in

[bbpm.ts:32](https://github.com/jojotastic777/bitburner-bbpm/blob/4af6d6d/src/bin/bbpm.ts#L32)

___

### PackageList

Ƭ **PackageList**: `Object`

A package list.
These are how bbpm knows what packages are available for installation.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name of the package list. |
| `packages` | [`Package`](modules.md#package)[] | A list of packages, which bbpm can install. |

#### Defined in

[bbpm.ts:16](https://github.com/jojotastic777/bitburner-bbpm/blob/4af6d6d/src/bin/bbpm.ts#L16)

___

### PackageReference

Ƭ **PackageReference**: `string`

A reference to a particular package.

**`example`** A PackageReference to the official bbpm package.
bbpm-official/bbpm

#### Defined in

[bbpm.ts:10](https://github.com/jojotastic777/bitburner-bbpm/blob/4af6d6d/src/bin/bbpm.ts#L10)

## Functions

### main

▸ **main**(`ns`): `Promise`<`void`\>

The `main` function used by Bitburner when the script is being run.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ns` | `NS` | The Netscript context |

#### Returns

`Promise`<`void`\>

#### Defined in

[bbpm.ts:260](https://github.com/jojotastic777/bitburner-bbpm/blob/4af6d6d/src/bin/bbpm.ts#L260)
