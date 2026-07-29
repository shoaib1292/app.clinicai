SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('PricingRule','Clinic','Appointment','AppointmentFees','Invoice','Service') ORDER BY table_name, ordinal_position;
