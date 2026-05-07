const coursesService = require('../services/courses.service');
const { HttpError } = require('../utils/http-error');

async function list(_req, res, next) {
  try {
    const courses = await coursesService.listAll();
    res.json({ courses });
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    const course = await coursesService.findByIdWithMaterials(id);
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    res.json({ course });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, description, coverImageUrl } = req.body;
    const course = await coursesService.create({
      title,
      description,
      teacherId: req.user.id,
      coverImageUrl,
    });
    res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await coursesService.findById(id);
    if (!existing) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    if (req.user.role !== 'admin' && existing.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }

    const updated = await coursesService.update(id, {
      title: req.body.title,
      description: req.body.description,
      coverImageUrl: req.body.coverImageUrl,
    });
    res.json({ course: updated });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await coursesService.findById(id);
    if (!existing) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    if (req.user.role !== 'admin' && existing.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    await coursesService.deleteById(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function listStudents(req, res, next) {
  try {
    const id = Number(req.params.id);
    const course = await coursesService.findById(id);
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    if (req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    const students = await coursesService.listStudents(id);
    res.json({ students });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, create, update, remove, listStudents };
