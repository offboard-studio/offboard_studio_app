import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Link,
  useMediaQuery,
  useTheme,
  styled,
} from '@mui/material';
import { Check, ChevronRight } from '@mui/icons-material';

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  '& .MuiTableCell-root': {
    borderColor: theme.palette.divider,
  },
}));

const PricingTable = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const plans = [
    { name: 'Free', price: '$0', popular: false },
    { name: 'Team', price: '$99', popular: false },
    { name: 'Popular', price: '$150', popular: true },
    { name: 'Enterprise', price: '$490', popular: false },
  ];

  const features = [
    { name: 'Website number', values: ['01', '10', '50', 'Unlimited'] },
    {
      name: 'Server storage',
      values: ['100 GB', '500 GB', '1 TB', 'Unlimited'],
    },
    { name: 'Database', values: ['-', '15', 'Unlimited', 'Unlimited'] },
    { name: 'Unmetered Bandwidth', values: [false, true, true, true] },
    { name: 'SSD Disk', values: [false, false, true, true] },
    { name: 'VCPUS Fontworld', values: [false, false, true, true] },
    { name: 'WordPress install', values: [false, false, true, true] },
    { name: 'Server speed', values: [false, false, true, true] },
  ];

  return (
    <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
      <Box sx={{ px: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 'xl', mx: 'auto', mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem' },
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Pricing & Plans
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 2,
              fontSize: '1.125rem',
              color: 'text.secondary',
            }}
          >
            Amet minim mollit non deserunt ullam co est sit aliqua dolor do amet
            sint. Velit officia consequat duis enim velit mollit.
          </Typography>
        </Box>

        {isDesktop ? (
          <TableContainer>
            <Table sx={{ minWidth: 650, mt: 4 }}>
              <TableHead>
                <StyledTableRow>
                  <TableCell sx={{ py: 4 }}></TableCell>
                  {plans.map((plan) => (
                    <TableCell
                      key={plan.name}
                      align="center"
                      sx={{
                        py: 4,
                        bgcolor: plan.popular ? 'grey.900' : 'transparent',
                        borderTopLeftRadius: plan.popular ? 16 : 0,
                        borderTopRightRadius: plan.popular ? 16 : 0,
                      }}
                    >
                      {plan.popular && (
                        <Chip
                          label="Popular"
                          color="primary"
                          sx={{
                            mb: 2,
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Typography
                        variant="h3"
                        sx={{
                          fontSize: '3rem',
                          fontWeight: 700,
                          color: plan.popular ? 'common.white' : 'text.primary',
                        }}
                      >
                        {plan.price}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: plan.popular ? 'grey.300' : 'text.secondary',
                        }}
                      >
                        Per month
                      </Typography>
                    </TableCell>
                  ))}
                </StyledTableRow>
              </TableHead>

              <TableBody>
                {features.map((feature) => (
                  <StyledTableRow key={feature.name}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontWeight: 600 }}
                    >
                      {feature.name}
                    </TableCell>
                    {feature.values.map((value, index) => (
                      <TableCell
                        key={index}
                        align="center"
                        sx={{
                          bgcolor: plans[index].popular
                            ? 'grey.900'
                            : 'transparent',
                          color: plans[index].popular
                            ? 'common.white'
                            : 'text.primary',
                        }}
                      >
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check sx={{ fontSize: 24 }} />
                          ) : (
                            '-'
                          )
                        ) : (
                          value
                        )}
                      </TableCell>
                    ))}
                  </StyledTableRow>
                ))}

                <StyledTableRow>
                  <TableCell sx={{ py: 4 }}></TableCell>
                  {plans.map((plan) => (
                    <TableCell
                      key={plan.name}
                      align="center"
                      sx={{
                        py: 4,
                        bgcolor: plan.popular ? 'warning.main' : 'transparent',
                        borderBottomLeftRadius: plan.popular ? 16 : 0,
                        borderBottomRightRadius: plan.popular ? 16 : 0,
                      }}
                    >
                      <Link
                        href="#"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontWeight: 600,
                          color: plan.popular ? 'common.white' : 'primary.main',
                          '&:hover': {
                            color: plan.popular
                              ? 'common.white'
                              : 'primary.dark',
                          },
                        }}
                      >
                        Get Started
                        <ChevronRight sx={{ ml: 1 }} />
                      </Link>
                    </TableCell>
                  ))}
                </StyledTableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{
              mt: 4,
              borderTop: 1,
              borderBottom: 1,
              borderColor: 'divider',
              '& > div': { py: 2 },
            }}
          >
            <Grid
              container
              spacing={0}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {plans.map((plan) => (
                <div></div>
                // <Grid
                //   item
                //   xs={3}
                //   key={plan.name}
                //   sx={{
                //     textAlign: 'center',
                //     borderRight: 1,
                //     borderColor: 'divider',
                //     py: 2,
                //   }}
                // >
                //   <Typography variant="subtitle2" color="primary">
                //     {plan.name}
                //   </Typography>
                //   <Typography variant="h5" sx={{ fontWeight: 700 }}>
                //     {plan.price}
                //   </Typography>
                //   <Typography variant="caption" color="text.secondary">
                //     Per month
                //   </Typography>
                // </Grid>
              ))}
            </Grid>

            {features.map((feature) => (
              <Box key={feature.name}>
                <Box sx={{ px: 2, py: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2">{feature.name}</Typography>
                </Box>
                <Grid
                  container
                  spacing={0}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  {feature.values.map((value, index) => (
                    <div></div>
                    // <Grid
                    //   item
                    //   xs={3}
                    //   key={index}
                    //   sx={{
                    //     textAlign: 'center',
                    //     borderRight: 1,
                    //     borderColor: 'divider',
                    //     py: 2,
                    //   }}
                    // >
                    //   {typeof value === 'boolean' ? (
                    //     value ? (
                    //       <Check sx={{ fontSize: 24 }} />
                    //     ) : (
                    //       '-'
                    //     )
                    //   ) : (
                    //     value
                    //   )}
                    // </Grid>
                  ))}
                </Grid>
              </Box>
            ))}

            <Grid container spacing={0}>
              {plans.map((plan) => (
                <div></div>
                // <Grid
                //   item
                //   xs={3}
                //   key={plan.name}
                //   sx={{
                //     textAlign: 'center',
                //     borderRight: 1,
                //     borderColor: 'divider',
                //     p: 2
                //   }}
                // >
                //   <Typography variant="subtitle2" color="primary">
                //     {plan.name}
                //   </Typography>
                //   <Typography variant="h5" sx={{ fontWeight: 700 }}>
                //     {plan.price}
                //   </Typography>
                //   <Typography variant="caption" color="text.secondary">
                //     Per month
                //   </Typography>
                //   <Button
                //     fullWidth
                //     variant="contained"
                //     color="primary"
                //     endIcon={<ChevronRight />}
                //     sx={{ mt: 2 }}
                //   >
                //     Get Started
                //   </Button>
                // </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PricingTable;
