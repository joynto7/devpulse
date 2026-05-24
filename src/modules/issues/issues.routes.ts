import { Router, Request, Response } from 'express';
import pool from '../../config/db';
import { ok, created, err } from '../../utils/response';
import { authenticate, requireMaintainer } from '../../middleware/auth';
const router = Router();

interface IssueRow {
  id: number; title: string; description: string;
  type: string; status: string; reporter_id: number;
  created_at: Date; updated_at: Date;
}

interface ReporterRow { id: number; name: string; role: string; }


const getReporter = async (id: number): Promise<ReporterRow> => {
  const r = await pool.query<ReporterRow>(
    'SELECT id,name,role FROM users WHERE id=$1', [id]
  );
  return r.rows[0] ?? { id, name: 'Unknown', role: 'contributor' };
};

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sort   = (req.query.sort   as string) ?? 'newest';
    const type   = req.query.type   as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions: string[] = [];
    const values: string[] = [];
    let i = 1;

    if (type)   { conditions.push(`type=$${i++}`);   values.push(type); }
    if (status) { conditions.push(`status=$${i++}`); values.push(status); }

     const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = sort === 'oldest' ? 'ASC' : 'DESC';

    const result = await pool.query<IssueRow>(
      `SELECT * FROM issues ${where} ORDER BY created_at ${order}`, values
    );

    if (result.rows.length === 0) { ok(res, 'Issues retrieved successfully', []); return; }


    const uniqueIds = [...new Set(result.rows.map((r) => r.reporter_id))];
    const reporters = await Promise.all(uniqueIds.map(getReporter));
    const reporterMap = new Map<number, ReporterRow>(reporters.map((r) => [r.id, r]));

    const issues = result.rows.map(({ reporter_id, ...issue }) => ({
      ...issue,
      reporter: reporterMap.get(reporter_id),
    }));

    ok(res, 'Issues retrieved successfully', issues);
  } catch (e) {
    err(res, 500, 'Server error.', (e as Error).message);
  }
});


router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<IssueRow>(
      'SELECT * FROM issues WHERE id=$1', [req.params.id]
    );
    const issue = result.rows[0];
    if (!issue) { err(res, 404, 'Issue not found.'); return; }

    const reporter = await getReporter(issue.reporter_id);
    const { reporter_id, ...rest } = issue;
    void reporter_id;
    ok(res, 'Issue retrieved successfully', { ...rest, reporter });
  } catch (e) {
    err(res, 500, 'Server error.', (e as Error).message);
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      err(res, 401, 'User not authenticated properly.'); return;
    }
    const { title, description, type } = req.body as {
      title: string; description: string; type: string;
    };

    if (!title || !description || !type) {
      err(res, 400, 'title, description and type are required.'); return;
    }
    if (title.length > 150) {
      err(res, 400, 'Title must be 150 characters or less.'); return;
    }
    if (description.length < 20) {
      err(res, 400, 'Description must be at least 20 characters.'); return;
    }
    if (!['bug', 'feature_request'].includes(type)) {
      err(res, 400, 'Type must be bug or feature_request.'); return;
    }

    const result = await pool.query<IssueRow>(
      `INSERT INTO issues (title,description,type,reporter_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, description, type, req.user!.id]
    );
    created(res, 'Issue created successfully', result.rows[0]);
  } catch (e) {
    err(res, 500, 'Server error.', (e as Error).message);
  }
});


router.patch('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const issueRes = await pool.query<IssueRow>(
      'SELECT * FROM issues WHERE id=$1', [req.params.id]
    );
    const issue = issueRes.rows[0];
    if (!issue) { err(res, 404, 'Issue not found.'); return; }

    const { id: userId, role } = req.user!;
    const { title, description, type, status } = req.body as {
      title?: string; description?: string; type?: string; status?: string;
    };

    if (role === 'contributor') {
      if (issue.reporter_id !== userId) {
        err(res, 403, 'You can only edit your own issues.'); return;
      }
      if (issue.status !== 'open') {
        err(res, 409, 'You can only edit open issues.'); return;
      }
      if (status !== undefined) {
        err(res, 403, 'Contributors cannot change issue status.'); return;
      }
    }

     const sets: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;

    if (title !== undefined) {
      if (title.length > 150) { err(res, 400, 'Title max 150 chars.'); return; }
      sets.push(`title=$${i++}`); vals.push(title);
    }
    if (description !== undefined) {
      if (description.length < 20) { err(res, 400, 'Description min 20 chars.'); return; }
      sets.push(`description=$${i++}`); vals.push(description);
    }
    if (type !== undefined) {
      if (!['bug', 'feature_request'].includes(type)) { err(res, 400, 'Invalid type.'); return; }
      sets.push(`type=$${i++}`); vals.push(type);
    }
    if (status !== undefined) {
      if (!['open', 'in_progress', 'resolved'].includes(status)) {
        err(res, 400, 'Invalid status.'); return;
      }
      sets.push(`status=$${i++}`); vals.push(status);
    }

    if (sets.length === 0) { err(res, 400, 'No fields to update.'); return; }

    sets.push('updated_at=NOW()');
    vals.push(Number(req.params.id));

    const updated = await pool.query<IssueRow>(
      `UPDATE issues SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    ok(res, 'Issue updated successfully', updated.rows[0]);
  } catch (e) {
    err(res, 500, 'Server error.', (e as Error).message);
  }
});

router.delete('/:id', authenticate, requireMaintainer, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id FROM issues WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) { err(res, 404, 'Issue not found.'); return; }

    await pool.query('DELETE FROM issues WHERE id=$1', [req.params.id]);
    ok(res, 'Issue deleted successfully');
  } catch (e) {
    err(res, 500, 'Server error.', (e as Error).message);
  }
});

export default router;



    
