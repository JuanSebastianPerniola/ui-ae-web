const { proxyIberostarRequest } = require("./_iberostar-proxy");

module.exports = (request, response) =>
  proxyIberostarRequest(request, response, "/api/availability/search");
