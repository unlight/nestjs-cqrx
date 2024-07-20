## [3.0.0](https://github.com/unlight/nestjs-cqrx/compare/v2.6.1...v3.0.0) (2024-07-20)


### ⚠ BREAKING CHANGES

* Remove deprecated functions

### Miscellaneous Chores

* Remove deprecated functions ([e5aa920](https://github.com/unlight/nestjs-cqrx/commit/e5aa9203d83f3317268ba459b9145a8bd70427dc))

## [2.6.1](https://github.com/unlight/nestjs-cqrx/compare/v2.6.0...v2.6.1) (2024-06-30)


### Bug Fixes

* Remove 2nd argument when creating repository ([aba4909](https://github.com/unlight/nestjs-cqrx/commit/aba4909b055f6a92562122c8fd6be997f87ff970))

## [2.6.0](https://github.com/unlight/nestjs-cqrx/compare/v2.5.0...v2.6.0) (2024-06-30)


### Features

* Set stream name via static property ([c0faa70](https://github.com/unlight/nestjs-cqrx/commit/c0faa70f4be28b4710dd710613d7f38bb01fc497))

## [2.5.0](https://github.com/unlight/nestjs-cqrx/compare/v2.4.2...v2.5.0) (2024-05-18)


### Features

* Create aggregate from repository ([2b0efdc](https://github.com/unlight/nestjs-cqrx/commit/2b0efdc39a9fc4524b91ed37b02551ae1ec458e2))

## [2.4.2](https://github.com/unlight/nestjs-cqrx/compare/v2.4.1...v2.4.2) (2024-05-11)


### Bug Fixes

* Rework `streamIdAndAggregate` method ([71671a9](https://github.com/unlight/nestjs-cqrx/commit/71671a927cc45147fc7ee1ae192845ba57f51823))

## [2.4.1](https://github.com/unlight/nestjs-cqrx/compare/v2.4.0...v2.4.1) (2024-05-11)


### Bug Fixes

* Rework `streamIdAndAggregate` method ([46ab927](https://github.com/unlight/nestjs-cqrx/commit/46ab9273efd0e124eb1b6729e7db0765d724d7a3))

## [2.4.0](https://github.com/unlight/nestjs-cqrx/compare/v2.3.0...v2.4.0) (2024-05-11)


### Features

* Add new method ([7245059](https://github.com/unlight/nestjs-cqrx/commit/7245059b7676bde25a7e43d0b5150bf3c0a8b055))

## [2.3.0](https://github.com/unlight/nestjs-cqrx/compare/v2.2.0...v2.3.0) (2024-04-29)


### Features

* Add publish method ([edbbead](https://github.com/unlight/nestjs-cqrx/commit/edbbeadb23d9cd9da6968b2c66c3cc72ddb581b4))

## [2.2.0](https://github.com/unlight/nestjs-cqrx/compare/v2.1.0...v2.2.0) (2024-04-07)


### Features

* Aggregate constructor overloads ([1d466df](https://github.com/unlight/nestjs-cqrx/commit/1d466dfc493647ea15ebbe7583268db6d505a239))

## [2.1.0](https://github.com/unlight/nestjs-cqrx/compare/v2.0.4...v2.1.0) (2024-04-07)


### Features

* Return append result from save ([26bb6f2](https://github.com/unlight/nestjs-cqrx/commit/26bb6f2b2d4be926b85ef60d1e291930e3c9f0ea))

## [2.0.4](https://github.com/unlight/nestjs-cqrx/compare/v2.0.3...v2.0.4) (2024-04-07)


### Bug Fixes

* Return commit from append result ([47bd6e6](https://github.com/unlight/nestjs-cqrx/commit/47bd6e6daaf7e5cd8f330f15cfeecb15ebcf0787))

## [2.0.3](https://github.com/unlight/nestjs-cqrx/compare/v2.0.2...v2.0.3) (2024-04-06)


### Bug Fixes

* Parameters are not decorated ([9120971](https://github.com/unlight/nestjs-cqrx/commit/9120971f186a8b4ec40468e6c7eacffbaee31ee2))

## [2.0.2](https://github.com/unlight/nestjs-cqrx/compare/v2.0.1...v2.0.2) (2024-03-31)


### Bug Fixes

* Auto register transform ([d957bc2](https://github.com/unlight/nestjs-cqrx/commit/d957bc24837c396d244cbbd8117a5606a3134e11))

## [2.0.1](https://github.com/unlight/nestjs-cqrx/compare/v2.0.0...v2.0.1) (2024-03-25)


### Bug Fixes

* Add metadata from recorded event ([f934194](https://github.com/unlight/nestjs-cqrx/commit/f9341948547c7833a7f55fc4ddd3ea5dabb1f9e5))

## [2.0.0](https://github.com/unlight/nestjs-cqrx/compare/v1.2.0...v2.0.0) (2024-03-24)


### ⚠ BREAKING CHANGES

* Update dependencies to latest majors

### Bug Fixes

* Dispose eventstore client on module destroy ([df17f0a](https://github.com/unlight/nestjs-cqrx/commit/df17f0a4590916e79009d4fee2740d65785fce53))
* Make apply events sequential ([c96c97b](https://github.com/unlight/nestjs-cqrx/commit/c96c97b991d7a97840a7e2ed19cd5c263c879a83))

## [1.2.0](https://github.com/unlight/nestjs-cqrx/compare/v1.1.1...v1.2.0) (2022-03-06)


### Features

* Automatic add events to transform service ([5d8aa9e](https://github.com/unlight/nestjs-cqrx/commit/5d8aa9ea73a8bd48855053e2d1c03948cc642984))

### [1.1.1](https://github.com/unlight/nestjs-cqrx/compare/v1.1.0...v1.1.1) (2022-03-05)


### Bug Fixes

* Push event to bus if it has transform ([4c8383b](https://github.com/unlight/nestjs-cqrx/commit/4c8383b7cb62e53f9efefa14ba0ec993cceb51de))

## [1.1.0](https://github.com/unlight/nestjs-cqrx/compare/v1.0.0...v1.1.0) (2022-02-27)


### Features

* **event publisher:** Add mergeClassContext method ([7d8bae2](https://github.com/unlight/nestjs-cqrx/commit/7d8bae2a3cbdd882d20b8ef4b055cc31a0127498))

## 1.0.0 (2022-02-25)


### Features

* First release ([7eea1e9](https://github.com/unlight/nestjs-cqrx/commit/7eea1e924c8cee75103ea3d6c5355b1affd98d16))
