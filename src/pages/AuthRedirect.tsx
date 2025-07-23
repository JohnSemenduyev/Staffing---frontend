import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_portal_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'admin') {
          navigate('/scheduling-geolocation', { replace: true });
        } else if (user.role === 'manager') {
          navigate('/scheduling', { replace: true }); // adjust this path to your manager default
        } else {
          navigate('/login', { replace: true });
        }
      } catch {
        localStorage.removeItem('admin_portal_user');
        navigate('/login', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
};

export default AuthRedirect;
