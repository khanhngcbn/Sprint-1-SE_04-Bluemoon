import React, { useState, useEffect } from 'react';
import {  Box,  Flex,  Text,  Spinner,  useColorModeValue,  useToast,  Card,  Button,  FormControl,  FormLabel,  Select,  Input,  InputGroup,  InputLeftElement,  SimpleGrid,  Stat,  StatLabel,  StatNumber,  StatHelpText,  StatArrow,  Progress,  Modal,  ModalOverlay,  ModalContent,  ModalHeader,  ModalBody,  ModalCloseButton,  ModalFooter,  useDisclosure,  Badge,  Divider,  NumberInput,  NumberInputField,  NumberInputStepper,  NumberIncrementStepper,  NumberDecrementStepper,  Tabs,  TabList,  TabPanels,  Tab,  TabPanel,  Table,  Thead,  Tbody,  Tr,  Th,  Td,  Image,  VStack,  Icon,  Link,  Tooltip,  HStack,  Heading,} from '@chakra-ui/react';
import { MdFilterList, MdFileDownload, MdSearch, MdRefresh, MdPayment, MdAddCircle, MdHistory, MdOutlineInfo, MdArrowForward, MdOutlineFileDownload, MdAssignment } from 'react-icons/md';
import { FaRegHandshake, FaHandHoldingUsd } from 'react-icons/fa';
import api from 'services/apiConfig';

// Components
import ContributionCard from './components/ContributionCard';

// API Service
import {
  getActiveContributions,
  getClosedContributions,
  filterContributions,
  getUserFormData,
} from 'views/admin/contributions/services/contributionService';

function UserContribution() {
  const [contributions, setContributions] = useState([]);
  const [userContributionStats, setUserContributionStats] = useState({
    totalPaid: 0,
    totalAmount: 0,
    pendingCount: 0,
    paidCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    type: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [contributionAmount, setContributionAmount] = useState(100000); // Giá trị mặc định
  const [apartments, setApartments] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState('');
  const [contributionFormData, setContributionFormData] = useState(null);
  
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isContributeOpen, onOpen: onContributeOpen, onClose: onContributeClose } = useDisclosure();
  
  const toast = useToast();
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.700');
  const cardShadow = useColorModeValue('0px 18px 40px rgba(112, 144, 176, 0.12)', 'none');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get active contributions
      const activeData = await getActiveContributions();
      const activeContributions = Array.isArray(activeData) ? activeData : [];

      // Get user contribution history
      const historyData = await getClosedContributions();
      const historyContributions = Array.isArray(historyData) ? historyData : [];
      
      // Get user contribution stats - lấy trực tiếp từ API
      try {
        const userContributionsData = await api.get('/contributions/user/stats');
        if (userContributionsData && userContributionsData.data) {
          const stats = userContributionsData.data;
          setUserContributionStats({
            totalPaid: stats.totalPaid || 0,
            totalAmount: stats.totalAmount || 0,
            pendingCount: stats.pendingCount || 0,
            paidCount: stats.paidCount || 0
          });
        }
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        
        // Fallback: Tính toán từ dữ liệu contribution nếu API stats lỗi
        let totalPaid = 0;
        let totalAmount = 0;
        let pendingCount = 0;
        let paidCount = 0;
        
        // Tính từ các contribution đang hiển thị
        for (const contribution of activeContributions) {
          try {
            const detailResponse = await api.get(`/contributions/user/${contribution.id}`);
            if (detailResponse && detailResponse.data && detailResponse.data.residentContributions) {
              detailResponse.data.residentContributions.forEach(rc => {
                const amount = rc.amount || 0;
                totalAmount += amount;
                
                if (rc.paymentStatus === 'PAID') {
                  totalPaid += amount;
                  paidCount++;
                } else {
                  pendingCount++;
                }
              });
            }
          } catch (e) {
            console.error(`Error fetching detail for contribution ${contribution.id}:`, e);
          }
        }
        
        setUserContributionStats({
          totalPaid,
          totalAmount,
          pendingCount,
          paidCount
        });
      }
      
      // Sort to have active contributions at the top
      const allContributions = [...activeContributions, ...historyContributions];
      setContributions(allContributions);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Cannot load data, please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  const applyFilters = async () => {
    setIsLoading(true);
    try {
      const response = await filterContributions(filters);
      const filteredData = Array.isArray(response) ? response : [];
      
      setContributions(filteredData);
      
      toast({
        title: 'Success',
        description: 'Filters applied successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply filters',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
      type: 'all',
    });
    setSearchTerm('');
    fetchData();
  };
  
  const handleViewDetails = (contribution) => {
    setSelectedContribution(contribution);
    onDetailOpen();
  };
  
  // Filter contributions based on search term
  const filteredContributions = searchTerm 
    ? contributions.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.contributionTypeName && item.contributionTypeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.type?.name && item.type.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : contributions;
    
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const handleContribute = (contribution, e) => {
    e.stopPropagation();
    // Logic to open contribution modal or redirect to payment page
    console.log('Contributing to:', contribution.id);
    
    toast({
      title: 'Contribute',
      description: 'Redirecting to payment page...',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    // Open detail modal for user to view info and contribute
    viewContributionDetail(contribution);
  };

  const openContributeForm = async (contribution) => {
    setSelectedContribution(contribution);
    setContributionAmount(contribution.recommendedAmount || 100000);
    setIsLoading(true);

    try {
      const response = await api.get(`/contributions/user/${contribution.id}/contribute-form`);
      
      if (response && response.data) {
        setApartments(response.data.apartments || []);
        setSelectedApartment(response.data.apartments && response.data.apartments.length > 0 
          ? response.data.apartments[0].apartmentNumber 
          : '');
        setContributionFormData(response.data);
      }
      
      onContributeOpen();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể mở biểu mẫu đóng góp',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewContributionDetail = async (contribution) => {
    // Lưu contribution hiện tại để hiển thị ngay lập tức
    const currentContribution = {...contribution};
    setSelectedContribution(currentContribution);
    
    // Mở modal ngay lập tức với dữ liệu cơ bản
    onDetailOpen();
    
    setIsLoading(true);

    try {
      const response = await api.get(`/contributions/user/${contribution.id}`);
      
      if (response && response.data) {
        // Cập nhật số tiền đã đóng góp từ residentContributions
        let collectedAmount = 0;
        
        if (response.data.residentContributions && 
            Array.isArray(response.data.residentContributions)) {
            
          // Chỉ tính tổng từ những đóng góp đã thanh toán
          collectedAmount = response.data.residentContributions
            .filter(rc => rc.paymentStatus === 'PAID')
            .reduce((total, rc) => total + (rc.amount || 0), 0);
        }
        
        // Cập nhật thông tin contribution với số tiền đã thu thập
        setSelectedContribution({
          ...currentContribution,
          ...response.data.contribution,
          collectedAmount: collectedAmount
        });
      }
    } catch (error) {
      console.error("Error viewing contribution details:", error);
      // Không hiển thị thông báo lỗi vì đã hiển thị modal với dữ liệu cơ bản
    } finally {
      setIsLoading(false);
    }
  };

  const submitContribution = async () => {
    if (!selectedContribution || !selectedApartment) {
      toast({
        title: 'Cảnh báo',
        description: 'Vui lòng điền đầy đủ thông tin',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!contributionAmount || contributionAmount <= 0) {
      toast({
        title: 'Cảnh báo',
        description: 'Vui lòng nhập số tiền hợp lệ',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/contributions/user/contribute', {
        contributionId: selectedContribution.id,
        apartmentNumber: selectedApartment,
        amount: contributionAmount,
        notes: `Đóng góp cho ${selectedContribution.title || 'khoản đóng góp'}`
      });
      
      toast({
        title: 'Thành công',
        description: 'Đã tạo đóng góp thành công',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onContributeClose();
      fetchData();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error.response?.data || 'Không thể tạo đóng góp',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'PAID' || status === 'ACTIVE') return 'green';
    if (status === 'UNPAID' || status === 'CLOSED') return 'orange';
    if (status === 'FAILED' || status === 'CANCELED') return 'red';
    return 'gray';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'UNPAID': return 'Unpaid';
      case 'FAILED': return 'Failed';
      case 'ACTIVE': return 'Active';
      case 'CLOSED': return 'Closed';
      case 'CANCELED': return 'Canceled';
      default: return status;
    }
  };


  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Page title */}
      <Flex justifyContent="space-between" alignItems="center" mb="20px">
        <Text fontSize="2xl" fontWeight="bold" color={textColor}>
          Contribution Services
        </Text>
        
        <Flex gap={2}>
          <Button
            variant='outline'
            colorScheme='brand'
            leftIcon={<MdFilterList />}
            onClick={toggleFilters}
          >
            Filters
          </Button>
        </Flex>
      </Flex>
      
      {/* Stats section */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing="20px" mb="20px">
        <Card>
          <Stat p={4}>
            <StatLabel>Total Contributions</StatLabel>
            <StatNumber>{formatCurrency(userContributionStats.totalAmount)}</StatNumber>
            <StatHelpText>
              {userContributionStats.pendingCount + userContributionStats.paidCount} contributions
            </StatHelpText>
          </Stat>
        </Card>
        <Card>
          <Stat p={4}>
            <StatLabel>Paid</StatLabel>
            <StatNumber>{formatCurrency(userContributionStats.totalPaid)}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              {userContributionStats.paidCount} paid items
            </StatHelpText>
          </Stat>
        </Card>
        <Card>
          <Stat p={4}>
            <StatLabel>Unpaid</StatLabel>
            <StatNumber>{formatCurrency(userContributionStats.totalAmount - userContributionStats.totalPaid)}</StatNumber>
            <StatHelpText>
              <StatArrow type="decrease" />
              {userContributionStats.pendingCount} unpaid items
            </StatHelpText>
          </Stat>
        </Card>
        <Card>
          <Stat p={4}>
            <StatLabel>Completion Rate</StatLabel>
            <StatNumber>
              {userContributionStats.totalAmount > 0 
                ? Math.min(Math.round((userContributionStats.totalPaid / userContributionStats.totalAmount) * 10000) / 100, 100)
                : 0}%
            </StatNumber>
            <Progress 
              value={userContributionStats.totalAmount > 0 
                ? Math.min((userContributionStats.totalPaid / userContributionStats.totalAmount) * 100, 100) 
                : 0} 
              size="sm" 
              colorScheme="green"
              borderRadius="md"
              mt={2}
              w="100%"
              bgColor="gray.200"
            />
          </Stat>
        </Card>
      </SimpleGrid>
      
      {/* Search and Filters */}
      <Card mb="20px">
        <Flex p="20px" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
          <InputGroup width={{ base: '100%', md: '300px' }}>
            <InputLeftElement pointerEvents='none'>
              <MdSearch color='gray.400' />
            </InputLeftElement>
            <Input
              fontSize='sm'
              placeholder='Search contributions...'
              value={searchTerm}
              onChange={handleSearch}
              borderRadius='30px'
            />
          </InputGroup>
          
          <Button
            variant='brand'
            leftIcon={<MdRefresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Flex>
        
        {showFilters && (
          <Box px="20px" pb="20px">
            <Flex gap={4} flexWrap="wrap">
              <FormControl w={{ base: '100%', md: '200px' }}>
                <FormLabel fontSize="sm">Start Date</FormLabel>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </FormControl>
              <FormControl w={{ base: '100%', md: '200px' }}>
                <FormLabel fontSize="sm">End Date</FormLabel>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </FormControl>
              <FormControl w={{ base: '100%', md: '200px' }}>
                <FormLabel fontSize="sm">Status</FormLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </Select>
              </FormControl>
              <Flex alignItems="flex-end" gap={2}>
                <Button colorScheme="brand" onClick={applyFilters}>
                  Apply
                </Button>
                <Button variant="ghost" onClick={resetFilters}>
                  Reset
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Card>

      {/* Contribution Cards */}
      <Card p="20px">
        {isLoading ? (
          <Flex justifyContent="center" alignItems="center" height="300px">
            <Spinner size="xl" color="brand.500" />
          </Flex>
        ) : filteredContributions.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="20px">
            {filteredContributions.map((contribution) => (
              <Card
                key={contribution.id}
                p="20px"
                borderRadius="lg"
                boxShadow="md"
                onClick={() => viewContributionDetail(contribution)}
                cursor="pointer"
                _hover={{ transform: 'translateY(-5px)', transition: 'all 0.3s' }}
              >
                <Flex justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Text fontWeight="bold" fontSize="lg" noOfLines={1}>{contribution.title || contribution.name}</Text>
                  <Badge 
                    colorScheme={
                      contribution.status === 'ACTIVE' || contribution.status === 'active' 
                        ? 'green' 
                        : contribution.status === 'CLOSED' || contribution.status === 'closed'
                          ? 'orange'
                          : 'gray'
                    }
                  >
                    {contribution.status}
                  </Badge>
                </Flex>
                
                <Text color="gray.500" fontSize="sm" mb={3}>
                  {contribution.contributionTypeName || (contribution.type && contribution.type.name) || 'General'}
                </Text>
                
                <Text fontSize="sm" noOfLines={2} mb={4}>
                  {contribution.description}
                </Text>
                
                <Flex justifyContent="space-between" fontSize="sm" mb={2}>
                  <Text color="gray.500">Start Date:</Text>
                  <Text>{formatDate(contribution.startDate)}</Text>
                </Flex>
                
                <Flex justifyContent="space-between" fontSize="sm" mb={3}>
                  <Text color="gray.500">End Date:</Text>
                  <Text>{formatDate(contribution.endDate) || 'No limit'}</Text>
                </Flex>

                {contribution.targetAmount > 0 && (
                  <>
                    <Progress 
                      value={Math.min(((contribution.totalPaidAmount || contribution.currentAmount || contribution.collectedAmount || 0) / contribution.targetAmount) * 100, 100)} 
                      colorScheme="green" 
                      size="sm" 
                      borderRadius="md" 
                      mb={2}
                      w="100%"
                      bgColor="gray.200"
                    />
                    <Flex justifyContent="space-between" fontSize="sm">
                      <Text fontWeight="medium">{formatCurrency(contribution.totalPaidAmount || contribution.currentAmount || contribution.collectedAmount || 0)}</Text>
                      <Text color="gray.500">
                        Target: {formatCurrency(contribution.targetAmount)}
                        ({Math.min(Math.round(((contribution.totalPaidAmount || contribution.currentAmount || contribution.collectedAmount || 0) / contribution.targetAmount) * 10000) / 100, 100)}%)
                      </Text>
                    </Flex>
                  </>
                )}
                
                {/* Show payment button if active */}
                {(contribution.status === 'ACTIVE' || contribution.status === 'active') && (
                  <Button 
                    colorScheme="green" 
                    size="sm" 
                    leftIcon={<MdPayment />} 
                    mt={4}
                    width="100%"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContribute(contribution, e);
                    }}
                  >
                    Contribute Now
                  </Button>
                )}
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Text fontSize="lg" textAlign="center" py="50px">
            No contributions found.
          </Text>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Contribution Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isLoading ? (
              <Flex justify="center" align="center" py={10}>
                <Spinner />
              </Flex>
            ) : selectedContribution ? (
              <Box>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={5}>
                  <Box>
                    <Heading size="md" mb={3}>{selectedContribution.title}</Heading>
                    <Badge colorScheme={getStatusColor(selectedContribution.status)} mb={3}>
                      {getStatusText(selectedContribution.status)}
                    </Badge>
                    <Text fontSize="sm" mb={3}>{selectedContribution.description}</Text>
                    
                    <SimpleGrid columns={2} spacingX={2} spacingY={1} mb={3}>
                      <Text fontSize="sm" fontWeight="bold">Contribution Type:</Text>
                      <Text fontSize="sm">{selectedContribution.contributionTypeName}</Text>
                      
                      <Text fontSize="sm" fontWeight="bold">Start Date:</Text>
                      <Text fontSize="sm">{formatDate(selectedContribution.startDate)}</Text>
                      
                      <Text fontSize="sm" fontWeight="bold">End Date:</Text>
                      <Text fontSize="sm">{formatDate(selectedContribution.endDate) || 'No limit'}</Text>
                    </SimpleGrid>
                  </Box>
                  
                  <Box>
                    <Stat mb={3}>
                      <StatLabel>Total Collected Amount</StatLabel>
                      <StatNumber>{formatCurrency(selectedContribution.totalPaidAmount || selectedContribution.currentAmount || selectedContribution.collectedAmount || 0)}</StatNumber>
                      {selectedContribution.targetAmount > 0 && (
                        <StatHelpText>
                          Target: {formatCurrency(selectedContribution.targetAmount)}
                          {` (${Math.round(((selectedContribution.totalPaidAmount || selectedContribution.currentAmount || selectedContribution.collectedAmount || 0) / selectedContribution.targetAmount) * 10000) / 100}%)`}
                        </StatHelpText>
                      )}
                    </Stat>
                    
                    {selectedContribution.status === 'ACTIVE' && (
                      <Button 
                        colorScheme="brand" 
                        leftIcon={<MdAddCircle />} 
                        w="100%"
                        onClick={() => openContributeForm(selectedContribution)}
                      >
                        Contribute Now
                      </Button>
                    )}
                  </Box>
                </SimpleGrid>
                
                {selectedContribution.targetAmount && (
                  <Box mb={4}>
                    <Flex justifyContent="space-between" mb={1}>
                      <Text fontWeight="medium">Progress</Text>
                      <Text>{Math.min(Math.round(((selectedContribution.totalPaidAmount || selectedContribution.currentAmount || selectedContribution.collectedAmount || 0) / selectedContribution.targetAmount) * 10000) / 100, 100)}%</Text>
                    </Flex>
                    <Progress 
                      value={Math.min(Math.round(((selectedContribution.totalPaidAmount || selectedContribution.currentAmount || selectedContribution.collectedAmount || 0) / selectedContribution.targetAmount) * 10000) / 100, 100)}
                      colorScheme="green" 
                      size="sm" 
                      borderRadius="md" 
                      mb={2}
                      w="100%"
                      bgColor="gray.200"
                    />
                    <Flex justifyContent="space-between" fontSize="sm">
                      <Text>{formatCurrency(selectedContribution.totalPaidAmount || selectedContribution.currentAmount || selectedContribution.collectedAmount || 0)}</Text>
                      <Text color="gray.500">Target: {formatCurrency(selectedContribution.targetAmount)}</Text>
                    </Flex>
                  </Box>
                )}
              </Box>
            ) : (
              <Text>No contribution details found</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDetailClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal đóng góp */}
      <Modal isOpen={isContributeOpen} onClose={onContributeClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Contribution</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isLoading ? (
              <Flex justify="center" align="center" py={10}>
                <Spinner />
              </Flex>
            ) : selectedContribution ? (
              <VStack spacing={4} align="stretch">
                <Text fontWeight="bold" fontSize="lg">{selectedContribution.title}</Text>
                
                <FormControl isRequired>
                  <FormLabel>Apartment</FormLabel>
                  <Select 
                    value={selectedApartment}
                    onChange={(e) => setSelectedApartment(e.target.value)}
                  >
                    {apartments.map((apt) => (
                      <option key={apt.id} value={apt.apartmentNumber}>{apt.apartmentNumber}</option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Contribution Amount</FormLabel>
                  <NumberInput 
                    min={1000} 
                    step={10000}
                    value={contributionAmount}
                    onChange={(valueString) => setContributionAmount(Number(valueString))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {formatCurrency(contributionAmount)}
                  </Text>
                </FormControl>
                
                {selectedContribution.description && (
                  <Box p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" fontStyle="italic">{selectedContribution.description}</Text>
                  </Box>
                )}
              </VStack>
            ) : (
              <Text>Contribution information not found</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="brand" 
              mr={3}
              isLoading={isLoading}
              onClick={submitContribution}
            >
              Contribute
            </Button>
            <Button onClick={onContributeClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserContribution; 
