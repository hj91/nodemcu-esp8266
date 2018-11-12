# file-bump

## Installation

```
npm install file-bump
```

## Usage

### Node.js

```
import bump from 'bump-file';

bump(file, [increment='patch']);
```

The second argument can also be an object:

```
bump(file, {
  increment,
  preId,        // Prerelease identifier (such as "alpha", "beta", "rc")
  get,          // Function to get version. Default: pkg => pkg.version
  set           // Function to set version. Default: (pkg, version) => pkg.version = version
});
```

### CLI

You can install this globally (`npm install -g file-bump`), and use from CLI:

```
bump file [increment] [preId]
```

## Examples

```
bump('package.json', 'minor'); // 1.0.0 → 1.1.0

bump('package.json', {         // 1.4.2 → 2.0.0-beta.0
  increment: 'premajor',
  preId: 'beta'
});
```

See the tests for more example.
