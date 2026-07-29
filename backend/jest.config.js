// The backend is native ESM ("type": "module"), so Jest runs the files as-is:
// transform is disabled and the suite is launched with --experimental-vm-modules
// (see the test script in package.json) rather than transpiled back to CommonJS.
export default {
  testEnvironment: 'node',
  transform: {},
};
