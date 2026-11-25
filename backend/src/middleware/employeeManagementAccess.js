import {getRawPool} from '../db.js';
import sql from '../sql-driver.js';

// Apply the same account boundary to legacy staff CRUD and the employee registry.
// Managers manage Staff; Admins manage Staff/Managers. Admin accounts use admin APIs.
export async function employeeManagementAccess(req,res,next){
  const allowed=Number(req.user?.role_id)===4 ? [2,3] : [2];
  const deny=()=>res.status(403).json({success:false,message:'This account role must be managed by an administrator.'});
  try{
    const pool=await getRawPool();
    if(req.body?.role_id!==undefined&&!allowed.includes(Number(req.body.role_id)))return deny();
    if(req.params.id!==undefined){
      const id=Number(req.params.id);
      if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({success:false,message:'Invalid employee ID.'});
      const target=(await pool.request().input('id',sql.Int,id).query(`
        SELECT ua.role_id FROM dbo.StaffProfiles sp
        JOIN dbo.UserAccounts ua ON ua.user_id=sp.user_id
          OR (sp.user_id IS NULL AND sp.email IS NOT NULL AND LOWER(ua.email)=LOWER(sp.email))
        WHERE sp.staff_id=@id`)).recordset;
      if(target.some(account=>!allowed.includes(Number(account.role_id))))return deny();
    }
    if(req.body?.role_name!==undefined){
      const role={'Restaurant Staff':2,'Manager':3,'Admin':4}[req.body.role_name];
      if(!role)return res.status(400).json({success:false,message:'Invalid account role.'});
      if(!allowed.includes(role))return deny();
    }
    if(req.body?.job_title_id!=null){
      const id=Number(req.body.job_title_id);
      if(!Number.isInteger(id)||id<1||id>255)return res.status(400).json({success:false,message:'Invalid job title.'});
      const title=(await pool.request().input('id',sql.TinyInt,id).query('SELECT requires_system_access,default_role_id FROM dbo.JobTitles WHERE job_title_id=@id')).recordset[0];
      if(!title)return res.status(400).json({success:false,message:'Invalid job title.'});
      if(title.requires_system_access&&!allowed.includes(Number(title.default_role_id)))return deny();
    }
    next();
  }catch(error){next(error);}
}
