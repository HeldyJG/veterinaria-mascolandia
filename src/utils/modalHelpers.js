'use strict';

function isModalRequest(req) {
  return req.get('X-Requested-With') === 'XMLHttpRequest';
}

function redirectAfterSave(req, res, listPath, detailPath) {
  const target = req.body.returnTo === 'list' ? listPath : detailPath;
  return res.redirect(target);
}

module.exports = { isModalRequest, redirectAfterSave };
