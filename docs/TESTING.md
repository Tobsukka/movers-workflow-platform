# Testing Documentation

This document outlines the testing strategy and setup for the Moving Company Management System.

## Test Types

### Unit Tests
- Located in `__tests__` directories next to the files they test
- Use Jest with TypeScript
- Mock external dependencies (database, external services)
- Focus on testing individual functions and components

### Integration Tests
- Located in `__tests__/integration` directories
- Test complete API flows and database operations
- Use a separate test database
- Run against real API endpoints
- Verify complete business flows

## Test Database Setup

### Configuration
- Database: PostgreSQL
- Port: 5433
- Connection URL: `postgresql://postgres:postgres@localhost:5433/management_test`
- Separate from development database to prevent data conflicts

### Test Data Management
- Database is reset between test runs
- Tables are cleaned before each test
- Deletion order respects foreign key constraints:
  1. Shifts
  2. Jobs
  3. Users

## Running Tests

### Commands
- All tests: `npm test`
- Unit tests only: `npm run test:unit`
- Integration tests only: `npm run test:integration`
- Watch mode: `npm run test:watch`
- Coverage report: `npm run test:coverage`

### Environment Variables
Required for testing:
- `JWT_SECRET`: Set automatically in test environment
- `JWT_REFRESH_SECRET`: Set automatically in test environment
- `DATABASE_URL`: Set automatically for test database

## Current Test Coverage

### Authentication
- [x] Employee Registration
  - Success case with validation
  - Duplicate email prevention
  - Database verification
- [x] Login
  - Success with valid credentials
  - Failure with invalid password
  - Prevention of unverified user login
  - JWT token generation and validation

### Jobs
- [ ] Creation
- [ ] Updates
- [ ] Deletion
- [ ] Status changes

### Shifts
- [ ] Assignment
- [ ] Completion
- [ ] Break management

## Best Practices

1. **Test Independence**
   - Each test should be independent
   - Clean up data between tests
   - Don't rely on test order

2. **Database Operations**
   - Use transactions where appropriate
   - Clean up data after tests
   - Use separate test database

3. **API Testing**
   - Test both success and failure cases
   - Verify response formats
   - Check HTTP status codes
   - Validate error messages

4. **Security Testing**
   - Test authentication requirements
   - Verify authorization rules
   - Check rate limiting
   - Validate input sanitization

## Next Steps

1. Add integration tests for:
   - Job management flows
   - Shift management flows
   - User management flows
   - Analytics endpoints

2. Implement end-to-end testing with:
   - User interface flows
   - Complete business processes
   - Cross-browser testing

3. Add performance testing:
   - Load testing
   - Stress testing
   - Response time verification 