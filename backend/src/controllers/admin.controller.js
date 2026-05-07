const usersService = require('../services/users.service');
const { HttpError } = require('../utils/http-error');

async function listUsers(_req, res, next) {
  try {
    const users = await usersService.listAll();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;

    const user = await usersService.findById(id);
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }

    const updated = await usersService.updateRole(id, role);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      throw new HttpError(
        400,
        'CANNOT_DELETE_SELF',
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
    }

    const ok = await usersService.deleteById(id);
    if (!ok) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, changeRole, deleteUser };
