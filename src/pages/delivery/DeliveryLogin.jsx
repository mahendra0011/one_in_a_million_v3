import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/account', { replace: true });
  }, [navigate]);
  return null;
}