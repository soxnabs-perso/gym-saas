/**
* Health check controller to monitor application status
*
* Shape matches the response documented on the route: status, timestamp,
* uptime, version.
*/
const healthCheck = (req, res) =>  {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  })
};

export { healthCheck }
