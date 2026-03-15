import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { updateBudget } from "../api/projectApi";

const BudgetEditor = ({ project }) => {
  const { user } = useContext(AuthContext);
  const [used, setUsed] = useState(project.budget_used);

  if (!["admin", "superadmin"].includes(user.role)) return null;

  return (
    <>
      <input
        value={used}
        onChange={(e) => setUsed(e.target.value)}
      />
      <button onClick={() => updateBudget(project.project_id, used)}>
        Update Budget
      </button>
    </>
  );
};

export default BudgetEditor;
