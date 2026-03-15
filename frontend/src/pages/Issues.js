import { useEffect, useState ,useContext} from "react";
import { getIssues } from "../api/issueApi";
import IssueTable from "../components/IssueTable";
import { AuthContext } from "../auth/AuthContext";

const Issues = () => {
  const { role } = useContext(AuthContext);  // ← get role from context
  const currentRole = (role || '').toLowerCase();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIssues()
      .then((res) => {
        setIssues(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading issues...</div>;

  return (
    <div style={{ padding: "20px" }}>
    <h2>{currentRole === 'tester' ? 'QA Issues' : 'Issues'}</h2>
    <IssueTable issues={issues} />
    </div>
    // <div style={{ padding: "20px" }}>
    //   <h2>Issues</h2>
    //   <IssueTable issues={issues} />
    // </div>
  );
};

export default Issues;